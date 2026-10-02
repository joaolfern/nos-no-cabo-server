import type { WebsiteNeighbours } from '@nosnocabo/contract'
import { WEBSITE_COLUMNS, type WebsiteRow, toWebsite } from './websites'

const PUBLISHED = "w.status = 'published'"
const RING_KEY = '(w.ring_group, w.published_at, w.id)'
const RING_ASC = 'w.ring_group, w.published_at, w.id'
const RING_DESC = 'w.ring_group DESC, w.published_at DESC, w.id DESC'
const FROM = `SELECT ${WEBSITE_COLUMNS} FROM websites w`

// Ring order (ADR 0004): verified first, then publication date. Matches websites_by_ring.
export const RING_SQL = {
  position: `SELECT w.ring_group AS unverified, w.published_at, w.id
    FROM websites w WHERE w.id = ? AND ${PUBLISHED}`,
  total:
    "SELECT value AS total FROM counters WHERE name = 'published_websites'",
  next: `${FROM} WHERE ${PUBLISHED} AND ${RING_KEY} > (?, ?, ?) ORDER BY ${RING_ASC} LIMIT 1`,
  first: `${FROM} WHERE ${PUBLISHED} ORDER BY ${RING_ASC} LIMIT 1`,
  previous: `${FROM} WHERE ${PUBLISHED} AND ${RING_KEY} < (?, ?, ?) ORDER BY ${RING_DESC} LIMIT 1`,
  last: `${FROM} WHERE ${PUBLISHED} ORDER BY ${RING_DESC} LIMIT 1`,
  maxRowid: 'SELECT COALESCE(max(rowid), 0) AS max FROM websites',
  random: `${FROM} WHERE ${PUBLISHED} AND w.id != ? AND w.rowid >= ? ORDER BY w.rowid LIMIT 1`,
  randomWrap: `${FROM} WHERE ${PUBLISHED} AND w.id != ? ORDER BY w.rowid LIMIT 1`,
  ids: `SELECT w.id FROM websites w WHERE ${PUBLISHED} ORDER BY ${RING_ASC}`,
  version: "SELECT value AS version FROM counters WHERE name = 'ring_version'",
}

type RingPosition = { unverified: number; published_at: number; id: string }

async function firstOf(
  db: D1Database,
  sql: string,
  params: unknown[],
  fallbackSql: string,
  fallbackParams: unknown[] = []
) {
  const row =
    (await db
      .prepare(sql)
      .bind(...params)
      .first<WebsiteRow>()) ??
    (await db
      .prepare(fallbackSql)
      .bind(...fallbackParams)
      .first<WebsiteRow>())
  return row && toWebsite(row)
}

export async function getNeighbours(
  db: D1Database,
  id: string
): Promise<WebsiteNeighbours | null> {
  const [position, total, maxRowid] = await db.batch<
    RingPosition | { total: number } | { max: number }
  >([
    db.prepare(RING_SQL.position).bind(id),
    db.prepare(RING_SQL.total),
    db.prepare(RING_SQL.maxRowid),
  ])

  const current = position?.results[0] as RingPosition | undefined
  if (!current) return null

  const published =
    (total?.results[0] as { total: number } | undefined)?.total ?? 0
  if (published < 2) return { previous: null, next: null, random: null }

  const key = [current.unverified, current.published_at, current.id]
  const max = (maxRowid?.results[0] as { max: number } | undefined)?.max ?? 0
  const start = Math.floor(Math.random() * (max + 1))

  const [next, previous, random] = await Promise.all([
    firstOf(db, RING_SQL.next, key, RING_SQL.first),
    firstOf(db, RING_SQL.previous, key, RING_SQL.last),
    firstOf(db, RING_SQL.random, [id, start], RING_SQL.randomWrap, [id]),
  ])

  return { previous, next, random }
}

export async function getRing(db: D1Database) {
  const [version, ids] = await db.batch<{ version: number } | { id: string }>([
    db.prepare(RING_SQL.version),
    db.prepare(RING_SQL.ids),
  ])

  return {
    version:
      (version?.results[0] as { version: number } | undefined)?.version ?? 0,
    ids: ((ids?.results ?? []) as { id: string }[]).map(({ id }) => id),
  }
}

export async function getRingVersion(db: D1Database) {
  const row = await db.prepare(RING_SQL.version).first<{ version: number }>()
  return row?.version ?? 0
}
