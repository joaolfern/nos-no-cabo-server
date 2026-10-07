import type { PushTarget } from '../lib/webPush'

export const MAX_SUBSCRIPTIONS_PER_WEBSITE = 5
export const SUBSCRIPTION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export type PushJob = PushTarget & {
  websiteId: string
  name: string
  status: 'published' | 'rejected'
}

// Only while the site is checking and below the cap; renewing an endpoint replaces it.
export async function addPushSubscription(
  db: D1Database,
  websiteId: string,
  target: PushTarget,
  now = Date.now()
) {
  const result = await db
    .prepare(
      `INSERT OR REPLACE INTO push_subscriptions (website_id, endpoint, p256dh, auth, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5
       WHERE EXISTS (SELECT 1 FROM websites WHERE id = ?1 AND status = 'checking')
         AND (SELECT COUNT(*) FROM push_subscriptions
              WHERE website_id = ?1 AND endpoint != ?2) < ?6`
    )
    .bind(
      websiteId,
      target.endpoint,
      target.p256dh,
      target.auth,
      now,
      MAX_SUBSCRIPTIONS_PER_WEBSITE
    )
    .run()
  return result.meta.changes > 0
}

// Deleting first claims the rows, so a decision is pushed at most once.
export async function claimDecidedPushes(
  db: D1Database,
  websiteId?: string
): Promise<PushJob[]> {
  const { results: claimed } = await db
    .prepare(
      `DELETE FROM push_subscriptions WHERE website_id IN (
         SELECT id FROM websites
         WHERE status != 'checking' AND (?1 IS NULL OR id = ?1))
       RETURNING website_id, endpoint, p256dh, auth`
    )
    .bind(websiteId ?? null)
    .all<{
      website_id: string
      endpoint: string
      p256dh: string
      auth: string
    }>()
  if (claimed.length === 0) return []

  const ids = [...new Set(claimed.map((row) => row.website_id))]
  const { results: websites } = await db
    .prepare(
      `SELECT id, name, status FROM websites
       WHERE id IN (SELECT value FROM json_each(?))`
    )
    .bind(JSON.stringify(ids))
    .all<{ id: string; name: string; status: PushJob['status'] }>()
  const byId = new Map(websites.map((website) => [website.id, website]))

  return claimed.flatMap(({ website_id, endpoint, p256dh, auth }) => {
    const website = byId.get(website_id)
    if (!website) return []
    return [
      {
        websiteId: website_id,
        endpoint,
        p256dh,
        auth,
        name: website.name,
        status: website.status,
      },
    ]
  })
}

export async function deleteExpiredPushSubscriptions(
  db: D1Database,
  now = Date.now()
) {
  await db
    .prepare('DELETE FROM push_subscriptions WHERE created_at < ?')
    .bind(now - SUBSCRIPTION_LIFETIME_MS)
    .run()
}
