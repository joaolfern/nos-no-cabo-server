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

// The dedupe key: scheme, www., case and trailing slashes don't make a different site.
export function normalizeUrl(input: string): string | null {
  const absolute = toAbsoluteUrl(input)
  if (!absolute) return null

  const { hostname, pathname, search } = new URL(absolute)
  const host = hostname.toLowerCase().replace(/^www\./, '')
  const path = pathname.replace(/\/+$/, '')

  return `${host}${path}${search}`
}
