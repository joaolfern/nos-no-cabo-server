import type { WebsiteStats } from '@nosnocabo/contract'

export type VisitKind = 'click' | 'referral'

export type SiteTotals = {
  websiteId: string
  clicks: number
  clicks30d: number
  netLikes: number
}

const RECENT_DAYS = 30

export function recentSince(day: string) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - (RECENT_DAYS - 1))
  return date.toISOString().slice(0, 10)
}

export async function recordVisits(
  db: D1Database,
  day: string,
  visitorHash: string,
  visits: { websiteId: string; kind: VisitKind }[]
) {
  await db.batch(
    visits.map(({ websiteId, kind }) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO visits (website_id, day, visitor_hash, kind) VALUES (?, ?, ?, ?)'
        )
        .bind(websiteId, day, visitorHash, kind)
    )
  )
}

export async function getStats(
  db: D1Database,
  websiteId: string,
  today: string
): Promise<WebsiteStats> {
  const row = await db
    .prepare(
      `SELECT t.clicks, t.referrals, t.likes, t.dislikes,
         (SELECT COALESCE(SUM(d.clicks), 0) FROM daily_stats d
          WHERE d.website_id = t.website_id AND d.day >= ?) AS clicks30d
       FROM site_totals t WHERE t.website_id = ?`
    )
    .bind(recentSince(today), websiteId)
    .first<WebsiteStats>()

  return row ?? { clicks: 0, clicks30d: 0, referrals: 0, likes: 0, dislikes: 0 }
}

export async function setVote(
  db: D1Database,
  websiteId: string,
  voterHash: string,
  value: 1 | -1 | 0,
  now: number
) {
  if (value === 0) {
    await db
      .prepare('DELETE FROM votes WHERE website_id = ? AND voter_hash = ?')
      .bind(websiteId, voterHash)
      .run()
    return
  }
  await db
    .prepare(
      `INSERT INTO votes (website_id, voter_hash, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (website_id, voter_hash) DO UPDATE SET
         value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(websiteId, voterHash, value, now)
    .run()
}

export async function allTotals(db: D1Database, today: string) {
  const { results } = await db
    .prepare(
      `SELECT t.website_id AS websiteId, t.clicks, t.likes - t.dislikes AS netLikes,
         COALESCE(r.recent, 0) AS clicks30d
       FROM site_totals t
       LEFT JOIN (SELECT website_id, SUM(clicks) AS recent FROM daily_stats
                  WHERE day >= ? GROUP BY website_id) r ON r.website_id = t.website_id`
    )
    .bind(recentSince(today))
    .all<SiteTotals>()
  return results
}

export async function deleteOldVisits(db: D1Database, today: string) {
  await db.prepare('DELETE FROM visits WHERE day < ?').bind(today).run()
}
