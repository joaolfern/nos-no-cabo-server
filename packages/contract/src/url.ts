const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i

export function toAbsoluteUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const withScheme = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withScheme)
    const isWebUrl = url.protocol === 'https:' || url.protocol === 'http:'
    const hasDomain = url.hostname.includes('.')

    return isWebUrl && hasDomain ? url.href : null
  } catch {
    return null
  }
}

// The dedupe key: scheme, www., case, trailing slashes and the query string don't make a
// different site; the path does.
export function normalizeUrl(input: string): string | null {
  const absolute = toAbsoluteUrl(input)
  if (!absolute) return null

  const { hostname, pathname } = new URL(absolute)
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return `${host}${pathname.replace(/\/+$/, '')}`
}
