import type { RejectionReason } from '@nosnocabo/contract'
import { shortCode } from '../lib/shortCode'

export type ReviewDecision =
  { action: 'dismiss' } | { action: 'ban'; reason: RejectionReason }

const SHORT_CODE_ATTEMPTS = 3

const isShortCodeCollision = (error: unknown) =>
  error instanceof Error && error.message.includes('websites.short_code')

// Same effect as the review script's dismiss: drops the reports or the hold and keeps the
// site published, publishing it if it was held.
async function dismiss(db: D1Database, id: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const [updated] = await db.batch<{ name: string }>([
        db
          .prepare(
            `UPDATE websites SET status = 'published', review_flag = NULL, rejection_reason = NULL,
               published_at = COALESCE(published_at, ?), short_code = COALESCE(short_code, ?)
             WHERE id = ? RETURNING name`
          )
          .bind(Date.now(), shortCode(), id),
        db.prepare('DELETE FROM reports WHERE website_id = ?').bind(id),
      ])
      return updated?.results[0]?.name ?? null
    } catch (error) {
      if (!isShortCodeCollision(error) || attempt >= SHORT_CODE_ATTEMPTS) {
        throw error
      }
    }
  }
}

// Takes the site down; the submitter sees the reason on their draft card.
async function ban(db: D1Database, id: string, reason: RejectionReason) {
  const row = await db
    .prepare(
      `UPDATE websites SET status = 'rejected', review_flag = NULL, rejection_reason = ?
       WHERE id = ? RETURNING name`
    )
    .bind(reason, id)
    .first<{ name: string }>()
  return row?.name ?? null
}

// Returns the site's name, or null when no site has this id.
export function applyReview(
  db: D1Database,
  id: string,
  decision: ReviewDecision
) {
  return decision.action === 'ban'
    ? ban(db, id, decision.reason)
    : dismiss(db, id)
}
