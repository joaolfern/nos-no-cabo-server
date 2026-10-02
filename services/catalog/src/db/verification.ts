import type { WebsiteStatus } from '@nosnocabo/contract'

const COOLDOWN_MS = 60_000
const RECHECK_AFTER_MS = 20 * 60 * 60 * 1000
const MISSES_TO_UNVERIFY = 2

export type VerificationTarget = {
  id: string
  url: string
  status: WebsiteStatus
  verifiedAt: string | null
}

export type VerificationKind = 'manual' | 'recheck'

export async function getVerificationTarget(
  db: D1Database,
  id: string
): Promise<VerificationTarget | null> {
  const row = await db
    .prepare('SELECT id, url, status, verified_at FROM websites WHERE id = ?')
    .bind(id)
    .first<{
      id: string
      url: string
      status: WebsiteStatus
      verified_at: number | null
    }>()
  if (!row) return null

  const { verified_at, ...target } = row
  return {
    ...target,
    verifiedAt:
      verified_at === null ? null : new Date(verified_at).toISOString(),
  }
}

// One UPDATE, so parallel requests can't both pass the per-site cooldown.
export async function claimVerificationCheck(
  db: D1Database,
  id: string,
  now = Date.now()
) {
  const result = await db
    .prepare(
      `UPDATE websites SET last_verification_check_at = ?
       WHERE id = ? AND status = 'published'
         AND (last_verification_check_at IS NULL OR last_verification_check_at <= ?)`
    )
    .bind(now, id, now - COOLDOWN_MS)
    .run()
  return result.meta.changes > 0
}

export async function recordVerification(
  db: D1Database,
  id: string,
  found: boolean,
  kind: VerificationKind,
  now = Date.now()
) {
  if (kind === 'manual') {
    if (!found) return
    await db
      .prepare(
        `UPDATE websites SET verified_at = COALESCE(verified_at, ?), verification_misses = 0
         WHERE id = ?`
      )
      .bind(now, id)
      .run()
    return
  }

  const statement = found
    ? db
        .prepare(
          `UPDATE websites SET verification_misses = 0, last_verification_check_at = ?
           WHERE id = ?`
        )
        .bind(now, id)
    : db
        .prepare(
          `UPDATE websites SET
             verified_at = CASE WHEN verification_misses + 1 >= ? THEN NULL ELSE verified_at END,
             verification_misses = CASE WHEN verification_misses + 1 >= ? THEN 0
               ELSE verification_misses + 1 END,
             last_verification_check_at = ?
           WHERE id = ?`
        )
        .bind(MISSES_TO_UNVERIFY, MISSES_TO_UNVERIFY, now, id)
  await statement.run()
}

export async function dueForRecheck(
  db: D1Database,
  limit: number,
  now = Date.now()
) {
  const { results } = await db
    .prepare(
      `SELECT id, url FROM websites
       WHERE verified_at IS NOT NULL AND status = 'published'
         AND (last_verification_check_at IS NULL OR last_verification_check_at < ?)
       ORDER BY last_verification_check_at IS NOT NULL, last_verification_check_at
       LIMIT ?`
    )
    .bind(now - RECHECK_AFTER_MS, limit)
    .all<{ id: string; url: string }>()
  return results
}
