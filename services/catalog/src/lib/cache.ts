// Shared caches (Cloudflare's CDN on a custom domain) may keep public lists briefly.
// Browsers must not: a stale list would hide a site right after its draft is published.
export const PUBLIC_LIST_CACHE = 'public, max-age=0, s-maxage=30'
export const NO_STORE = 'no-store'
