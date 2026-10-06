import type {
  Category,
  CategoryList,
  CategorySlug,
  Page,
  ParsedWebsiteListQuery,
  ParsedWebsiteSubmission,
  RejectionReason,
  Website,
  WebsiteStatus,
  WebsiteStatusEntry,
} from '@nosnocabo/contract'
import { toMatchQuery } from '../lib/searchQuery'
import { decodeCursor, encodeCursor } from './cursor'

export type WebsiteRow = {
  id: string
  url: string
  short_code: string | null
  name: string
  description: string
  color: string | null
  favicon_url: string | null
  repo: string | null
  categories: string
  status: WebsiteStatus
  rejection_reason: RejectionReason | null
  verified_at: number | null
  submitted_at: number
  published_at: number | null
  rank_score: number
  likes: number
  name_key: string
}

export const WEBSITE_COLUMNS = `
  w.id, w.url, w.short_code, w.name, w.description, w.color, w.favicon_url, w.repo,
  w.status, w.rejection_reason, w.verified_at, w.submitted_at, w.published_at,
  w.rank_score, w.likes, lower(w.name) AS name_key, w.category_slugs AS categories`

const toIso = (ms: number | null) =>
  ms === null ? null : new Date(ms).toISOString()

export function toWebsite(row: WebsiteRow): Website {
  return {
    id: row.id,
    url: row.url,
    shortCode: row.short_code,
    name: row.name,
    description: row.description,
    color: row.color,
    faviconUrl: row.favicon_url,
    ...(row.repo && { repo: row.repo }),
    categories: JSON.parse(row.categories) as CategorySlug[],
    status: row.status,
    ...(row.rejection_reason && { rejectionReason: row.rejection_reason }),
    verifiedAt: toIso(row.verified_at),
    submittedAt: toIso(row.submitted_at) as string,
    publishedAt: toIso(row.published_at),
    likes: row.likes,
  }
}

export async function findByNormalizedUrl(
  db: D1Database,
  urlNormalized: string
) {
  return db
    .prepare('SELECT id, status FROM websites WHERE url_normalized = ?')
    .bind(urlNormalized)
    .first<{ id: string; status: WebsiteStatus }>()
}

export type NewWebsite = ParsedWebsiteSubmission & {
  id: string
  url: string
  urlNormalized: string
  status: WebsiteStatus
  submittedAt: number
  publishedAt: number | null
  submitterIpHash: string
}

// A rejected site can be submitted again: the old row is replaced.
export async function insertWebsite(db: D1Database, website: NewWebsite) {
  const insertCategory = db.prepare(
    'INSERT INTO website_categories (website_id, category_slug) VALUES (?, ?)'
  )

  await db.batch([
    db
      .prepare(
        "DELETE FROM websites WHERE url_normalized = ? AND status = 'rejected'"
      )
      .bind(website.urlNormalized),
    db
      .prepare(
        `INSERT INTO websites (id, url, url_normalized, name, description, color,
          favicon_url, repo, status, submitted_at, published_at, submitter_ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        website.id,
        website.url,
        website.urlNormalized,
        website.name,
        website.description,
        website.color ?? null,
        website.faviconUrl ?? null,
        website.repo ?? null,
        website.status,
        website.submittedAt,
        website.publishedAt,
        website.submitterIpHash
      ),
    ...website.categories.map((slug) => insertCategory.bind(website.id, slug)),
  ])
}

export async function getWebsite(db: D1Database, id: string) {
  const row = await db
    .prepare(`SELECT ${WEBSITE_COLUMNS} FROM websites w WHERE w.id = ?`)
    .bind(id)
    .first<WebsiteRow>()

  return row && toWebsite(row)
}

export async function getStatuses(
  db: D1Database,
  ids: string[]
): Promise<WebsiteStatusEntry[]> {
  if (ids.length === 0) return []

  const placeholders = ids.map(() => '?').join(', ')
  const { results } = await db
    .prepare(
      `SELECT id, status, rejection_reason FROM websites WHERE id IN (${placeholders})`
    )
    .bind(...ids)
    .all<Pick<WebsiteRow, 'id' | 'status' | 'rejection_reason'>>()

  return results.map(({ id, status, rejection_reason }) => ({
    id,
    status,
    ...(rejection_reason && { rejectionReason: rejection_reason }),
  }))
}

type SortSpec = {
  orderBy: string
  key: string
  comparison: '<' | '>'
  cursorOf: (row: WebsiteRow) => (string | number | null)[]
}

const SORTS: Record<ParsedWebsiteListQuery['sort'], SortSpec> = {
  melhores: {
    orderBy: 'w.rank_score DESC, w.published_at DESC, w.id DESC',
    key: '(w.rank_score, w.published_at, w.id)',
    comparison: '<',
    cursorOf: (row) => [row.rank_score, row.published_at, row.id],
  },
  recentes: {
    orderBy: 'w.published_at DESC, w.id DESC',
    key: '(w.published_at, w.id)',
    comparison: '<',
    cursorOf: (row) => [row.published_at, row.id],
  },
  curtidos: {
    orderBy: 'w.likes DESC, w.published_at DESC, w.id DESC',
    key: '(w.likes, w.published_at, w.id)',
    comparison: '<',
    cursorOf: (row) => [row.likes, row.published_at, row.id],
  },
  az: {
    orderBy: 'lower(w.name) ASC, w.id ASC',
    key: '(lower(w.name), w.id)',
    comparison: '>',
    cursorOf: (row) => [row.name_key, row.id],
  },
}

type Statement = { sql: string; params: (string | number | null)[] }

function totalSql(
  query: ParsedWebsiteListQuery,
  where: string,
  params: (string | number | null)[]
): Statement {
  if (query.q) {
    return {
      sql: `SELECT COUNT(*) AS total FROM websites w WHERE ${where}`,
      params,
    }
  }
  if (query.categoria) {
    return {
      sql: 'SELECT published_count AS total FROM categories WHERE slug = ?',
      params: [query.categoria],
    }
  }
  return {
    sql: "SELECT value AS total FROM counters WHERE name = 'published_websites'",
    params: [],
  }
}

export class InvalidCursorError extends Error {}

export function listSql(
  query: ParsedWebsiteListQuery
): { page: Statement; total: Statement } | null {
  const sort = SORTS[query.sort]
  // With a search, the unary + lets the few FTS matches drive the query, not every published row.
  const filters = [
    query.q ? "+w.status = 'published'" : "w.status = 'published'",
  ]
  const params: (string | number | null)[] = []

  if (query.categoria) {
    filters.push(
      'EXISTS (SELECT 1 FROM website_categories wc WHERE wc.website_id = w.id AND wc.category_slug = ?)'
    )
    params.push(query.categoria)
  }
  if (query.q) {
    const match = toMatchQuery(query.q)
    if (!match) return null

    filters.push(
      'w.id IN (SELECT website_id FROM websites_fts WHERE websites_fts MATCH ?)'
    )
    params.push(match)
  }

  const where = filters.join(' AND ')
  const pageFilters = [where]
  const pageParams = [...params]

  if (query.cursor) {
    const values = decodeCursor(query.cursor)
    const arity = sort.key.split(',').length
    if (!values || values.length !== arity) throw new InvalidCursorError()

    pageFilters.push(
      `${sort.key} ${sort.comparison} (${values.map(() => '?').join(', ')})`
    )
    pageParams.push(...values)
  }

  return {
    page: {
      sql: `SELECT ${WEBSITE_COLUMNS} FROM websites w
         WHERE ${pageFilters.join(' AND ')}
         ORDER BY ${sort.orderBy} LIMIT ?`,
      params: [...pageParams, query.limit + 1],
    },
    total: totalSql(query, where, params),
  }
}

export async function listWebsites(
  db: D1Database,
  query: ParsedWebsiteListQuery
): Promise<Page<Website>> {
  const statements = listSql(query)
  if (!statements) return { items: [], nextCursor: null, total: 0 }

  const [page, count] = await db.batch<WebsiteRow | { total: number }>(
    [statements.page, statements.total].map(({ sql, params }) =>
      db.prepare(sql).bind(...params)
    )
  )

  const rows = (page?.results ?? []) as WebsiteRow[]
  const hasMore = rows.length > query.limit
  const items = rows.slice(0, query.limit)
  const last = items.at(-1)

  return {
    items: items.map(toWebsite),
    nextCursor:
      hasMore && last ? encodeCursor(SORTS[query.sort].cursorOf(last)) : null,
    total: (count?.results[0] as { total: number } | undefined)?.total ?? 0,
  }
}

export async function listCategories(db: D1Database): Promise<CategoryList> {
  const [categories, total] = await db.batch<Category | { total: number }>([
    db.prepare(
      'SELECT slug, published_count AS count FROM categories ORDER BY position'
    ),
    db.prepare(
      "SELECT value AS total FROM counters WHERE name = 'published_websites'"
    ),
  ])

  return {
    total: (total?.results[0] as { total: number } | undefined)?.total ?? 0,
    items: (categories?.results ?? []) as Category[],
  }
}
