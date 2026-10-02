// Turns seed/websites.json into idempotent SQL (sites are matched by their normalized URL).
import { readFileSync, writeFileSync } from 'node:fs'
import { normalizeUrl } from '@nosnocabo/contract'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function ulid(time) {
  let timePart = ''
  for (let i = 0, value = time; i < 10; i++, value = Math.floor(value / 32)) {
    timePart = ALPHABET[value % 32] + timePart
  }
  const random = crypto.getRandomValues(new Uint8Array(16))
  return timePart + Array.from(random, (byte) => ALPHABET[byte % 32]).join('')
}

// Same rule as src/lib/searchKey.ts.
function toSearchKey(...parts) {
  return parts
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const sql = (value) =>
  value === null || value === undefined
    ? 'NULL'
    : `'${String(value).replace(/'/g, "''")}'`

const websites = JSON.parse(
  readFileSync(new URL('../seed/websites.json', import.meta.url), 'utf8')
)

const statements = websites.flatMap((site) => {
  const publishedAt = Date.parse(site.publishedAt)
  const key = normalizeUrl(site.url)
  const columns = [
    ulid(publishedAt),
    site.url,
    key,
    site.name,
    site.description,
    site.color,
    site.faviconUrl,
    site.repo,
    'published',
    publishedAt,
    publishedAt,
    site.verified ? publishedAt : null,
    'seed',
    toSearchKey(site.name, site.description),
  ]

  return [
    `INSERT OR IGNORE INTO websites (id, url, url_normalized, name, description, color, favicon_url, repo, status, submitted_at, published_at, verified_at, submitter_ip_hash, search_key) VALUES (${columns.map((value) => (typeof value === 'number' ? value : sql(value))).join(', ')});`,
    ...site.categories.map(
      (slug) =>
        `INSERT OR IGNORE INTO website_categories (website_id, category_slug) SELECT id, ${sql(slug)} FROM websites WHERE url_normalized = ${sql(key)};`
    ),
  ]
})

writeFileSync(
  new URL('../seed/seed.sql', import.meta.url),
  statements.join('\n') + '\n'
)
console.log(`seed/seed.sql: ${websites.length} websites`)
