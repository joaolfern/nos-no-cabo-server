import { env } from 'cloudflare:test'

const EXPECTED_SLUGS = (websiteId: string) => `COALESCE((
  SELECT json_group_array(slug) FROM (
    SELECT c.slug FROM website_categories wc
    JOIN categories c ON c.slug = wc.category_slug
    WHERE wc.website_id = ${websiteId} ORDER BY c.position)), '[]')`

const DRIFT_QUERIES = {
  categoryCount: `
    SELECT c.slug AS key FROM categories c
    WHERE c.published_count != (
      SELECT COUNT(*) FROM website_categories wc
      JOIN websites w ON w.id = wc.website_id
      WHERE wc.category_slug = c.slug AND w.status = 'published')`,
  publishedTotal: `
    SELECT 'published_websites' AS key FROM counters
    WHERE name = 'published_websites'
      AND value != (SELECT COUNT(*) FROM websites WHERE status = 'published')`,
  categorySlugs: `
    SELECT w.id AS key FROM websites w
    WHERE w.category_slugs != ${EXPECTED_SLUGS('w.id')}`,
  searchMissing: `
    SELECT w.id AS key FROM websites w
    WHERE NOT EXISTS (SELECT 1 FROM websites_fts f
      WHERE f.website_id = w.id AND f.name = w.name AND f.description = w.description)`,
  searchOrphan: `
    SELECT f.website_id AS key FROM websites_fts f
    WHERE NOT EXISTS (SELECT 1 FROM websites w WHERE w.id = f.website_id)`,
}

// Every stored value compared with the same value computed from the source tables.
export async function derivedDrift(db: D1Database) {
  const results = await db.batch<{ key: string }>(
    Object.values(DRIFT_QUERIES).map((sql) => db.prepare(sql))
  )
  return Object.keys(DRIFT_QUERIES).flatMap((name, index) =>
    (results[index]?.results ?? []).map(({ key }) => `${name}:${key}`)
  )
}

export async function ringVersion(db: D1Database) {
  const row = await db
    .prepare("SELECT value FROM counters WHERE name = 'ring_version'")
    .first<{ value: number }>()
  return row?.value ?? 0
}

export async function rebuildDerived(db: D1Database) {
  const statements = env.TEST_REBUILD_SQL.split(/;\s*$/m)
    .map((sql) => sql.replace(/^--.*$/gm, '').trim())
    .filter(Boolean)
  await db.batch(statements.map((sql) => db.prepare(sql)))
}
