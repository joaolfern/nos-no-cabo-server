// Turns seed/websites.json into SQL that syncs the seeded sites (matched by normalized URL):
// seeded rows are updated in place, missing ones inserted, dropped ones deleted. Real
// submissions (submitter_ip_hash != 'seed') are never touched.
import { readFileSync, writeFileSync } from 'node:fs'
import { WebsiteSubmission, normalizeUrl } from '@nosnocabo/contract'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function ulid(time) {
  let timePart = ''
  for (let i = 0, value = time; i < 10; i++, value = Math.floor(value / 32)) {
    timePart = ALPHABET[value % 32] + timePart
  }
  const random = crypto.getRandomValues(new Uint8Array(16))
  return timePart + Array.from(random, (byte) => ALPHABET[byte % 32]).join('')
}

const SHORT_CODE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Same shape as src/lib/shortCode.ts: seeded sites skip moderation, which normally sets it.
function shortCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => SHORT_CODE_ALPHABET[byte % 62]).join('')
}

const sql = (value) =>
  value === null || value === undefined
    ? 'NULL'
    : `'${String(value).replace(/'/g, "''")}'`

const websites = JSON.parse(
  readFileSync(new URL('../seed/websites.json', import.meta.url), 'utf8')
)

for (const site of websites) {
  const submission = Object.fromEntries(
    Object.entries(site).filter(([, value]) => value !== null)
  )
  const { success, error } = WebsiteSubmission.safeParse(submission)
  if (!success) throw new Error(`${site.name}: ${error.message}`)
}

const SEEDED = "submitter_ip_hash = 'seed'"
const keys = websites.map((site) => sql(normalizeUrl(site.url)))

const statements = [
  `DELETE FROM websites WHERE ${SEEDED} AND url_normalized NOT IN (${keys.join(', ')});`,
  ...websites.flatMap((site) => {
    const publishedAt = Date.parse(site.publishedAt)
    const key = sql(normalizeUrl(site.url))
    const values = [
      sql(ulid(publishedAt)),
      sql(site.url),
      key,
      sql(site.name),
      sql(site.description),
      sql(site.color),
      sql(site.faviconUrl),
      sql(site.repo),
      "'published'",
      publishedAt,
      publishedAt,
      site.verified ? publishedAt : 'NULL',
      "'seed'",
      sql(shortCode()),
    ]
    const seededRow = `SELECT id FROM websites WHERE url_normalized = ${key} AND ${SEEDED}`

    return [
      `INSERT INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, short_code) VALUES (${values.join(', ')})
  ON CONFLICT (url_normalized) DO UPDATE SET url = excluded.url, name = excluded.name,
    description = excluded.description, color = excluded.color, favicon_url = excluded.favicon_url,
    repo = excluded.repo, published_at = excluded.published_at, verified_at = excluded.verified_at
  WHERE websites.${SEEDED};`,
      `DELETE FROM website_categories WHERE website_id IN (${seededRow});`,
      ...site.categories.map(
        (slug) =>
          `INSERT INTO website_categories (website_id, category_slug) ${seededRow.replace('SELECT id', `SELECT id, ${sql(slug)}`)};`
      ),
    ]
  }),
]

writeFileSync(
  new URL('../seed/seed.sql', import.meta.url),
  statements.join('\n') + '\n'
)
console.log(`seed/seed.sql: ${websites.length} websites`)
