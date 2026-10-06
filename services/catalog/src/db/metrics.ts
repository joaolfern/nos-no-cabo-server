export type RankInput = {
  id: string
  verified: boolean
  rankScore: number
  likes: number
}

export type MetricsUpdate = { id: string; rankScore?: number; likes?: number }

export async function getRankInputs(db: D1Database): Promise<RankInput[]> {
  const { results } = await db
    .prepare(
      `SELECT id, verified_at IS NOT NULL AS verified, rank_score, likes
       FROM websites WHERE status = 'published'`
    )
    .all<{ id: string; verified: number; rank_score: number; likes: number }>()

  return results.map((row) => ({
    id: row.id,
    verified: row.verified === 1,
    rankScore: row.rank_score,
    likes: row.likes,
  }))
}

// Absolute values from the metrics service (ADR 0005), so a repeated push changes nothing.
export async function setMetrics(db: D1Database, updates: MetricsUpdate[]) {
  const statements = updates.map(({ id, rankScore = null, likes = null }) =>
    db
      .prepare(
        `UPDATE websites SET rank_score = COALESCE(?, rank_score), likes = COALESCE(?, likes)
         WHERE id = ?`
      )
      .bind(rankScore, likes, id)
  )
  if (statements.length > 0) await db.batch(statements)
}

export async function isPublished(db: D1Database, id: string) {
  const row = await db
    .prepare(
      "SELECT 1 AS found FROM websites WHERE id = ? AND status = 'published'"
    )
    .bind(id)
    .first<{ found: number }>()
  return row !== null
}
