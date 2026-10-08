import type { CategorySlug, RejectionReason } from '@nosnocabo/contract'
import { shortCode } from '../lib/shortCode'
import { getWebsite } from './websites'

export type ReviewFlag = 'model_error' | 'unreachable' | 'reported'

export type ModerationOutcome =
  | { decision: 'publish' }
  | { decision: 'reject'; reason: RejectionReason }
  | { decision: 'hold'; flag: ReviewFlag }

export type ModerationResult = ModerationOutcome & {
  verdict: 'safe' | 'unsafe' | 'error'
  categoriesFlagged: string[]
  model: string
}

export type WebsiteForModeration = {
  id: string
  url: string
  name: string
  description: string
  categories: CategorySlug[]
  status: 'checking' | 'published' | 'rejected'
}

const SHORT_CODE_ATTEMPTS = 3

export async function getForModeration(
  db: D1Database,
  id: string
): Promise<WebsiteForModeration | null> {
  const website = await getWebsite(db, id)
  if (!website) return null

  const { url, name, description, categories, status } = website
  return { id, url, name, description, categories, status }
}

function outcomeUpdate(db: D1Database, id: string, outcome: ModerationOutcome) {
  const stillChecking = "WHERE id = ? AND status = 'checking'"

  switch (outcome.decision) {
    case 'publish':
      return db
        .prepare(
          `UPDATE websites SET status = 'published', published_at = ?, short_code = ?,
             review_flag = NULL ${stillChecking}`
        )
        .bind(Date.now(), shortCode(), id)
    case 'reject':
      return db
        .prepare(
          `UPDATE websites SET status = 'rejected', rejection_reason = ?,
             review_flag = NULL ${stillChecking}`
        )
        .bind(outcome.reason, id)
    // A repeated hold changes nothing, so it doesn't count as a new decision.
    case 'hold':
      return db
        .prepare(
          `UPDATE websites SET review_flag = ? ${stillChecking}
             AND review_flag IS NOT ?`
        )
        .bind(outcome.flag, id, outcome.flag)
  }
}

const isShortCodeCollision = (error: unknown) =>
  error instanceof Error && error.message.includes('websites.short_code')

// Only a site still in `checking` changes, so a retried queue message is harmless.
export async function applyModeration(
  db: D1Database,
  id: string,
  result: ModerationResult
): Promise<boolean> {
  const recordResult = db
    .prepare(
      `INSERT INTO moderation_results (website_id, verdict, categories_flagged, model, checked_at)
       SELECT ?, ?, ?, ?, ? WHERE EXISTS
         (SELECT 1 FROM websites WHERE id = ? AND status = 'checking')`
    )
    .bind(
      id,
      result.verdict,
      JSON.stringify(result.categoriesFlagged),
      result.model,
      Date.now(),
      id
    )

  for (let attempt = 1; ; attempt++) {
    try {
      const results = await db.batch([
        recordResult,
        outcomeUpdate(db, id, result),
      ])
      return (results[1]?.meta.changes ?? 0) > 0
    } catch (error) {
      if (!isShortCodeCollision(error) || attempt >= SHORT_CODE_ATTEMPTS) {
        throw error
      }
    }
  }
}

export async function flagForReview(
  db: D1Database,
  id: string,
  flag: ReviewFlag
) {
  await db
    .prepare('UPDATE websites SET review_flag = ? WHERE id = ?')
    .bind(flag, id)
    .run()
}

export async function deferModeration(
  db: D1Database,
  id: string,
  now = Date.now()
) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO moderation_backlog (website_id, deferred_at)
       SELECT id, ? FROM websites WHERE id = ? AND status = 'checking'`
    )
    .bind(now, id)
    .run()
}

export async function takeModerationBacklog(db: D1Database, limit: number) {
  const { results } = await db
    .prepare(
      `DELETE FROM moderation_backlog WHERE website_id IN (
         SELECT website_id FROM moderation_backlog
         ORDER BY deferred_at, website_id LIMIT ?)
       RETURNING website_id, deferred_at`
    )
    .bind(limit)
    .all<{ website_id: string; deferred_at: number }>()

  return results
    .sort(
      (a, b) =>
        a.deferred_at - b.deferred_at ||
        a.website_id.localeCompare(b.website_id)
    )
    .map(({ website_id }) => website_id)
}
