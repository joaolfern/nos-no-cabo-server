import { WEBSITE_LIMITS, type WebsitePreview } from '@nosnocabo/contract'

const FETCH_TIMEOUT_MS = 8000
const MANIFEST_TIMEOUT_MS = 4000
const USER_AGENT = 'NosNoCaboBot/1.0 (+https://nosnocabo.pages.dev)'
export const MAX_PAGE_BYTES = 1024 * 1024
const MAX_MANIFEST_BYTES = 100 * 1024

const DESCRIPTION_KEYS = [
  'description',
  'og:description',
  'twitter:description',
]
const IMAGE_KEYS = ['og:image', 'twitter:image']
const COLOR_KEYS = ['primary-color', 'theme_color', 'color', 'og:theme-color']

type Collected = {
  title: string
  ogTitle?: string
  metas: Map<string, string>
  iconHref?: string
  manifestHref?: string
}

export class UnreachableError extends Error {}

// Passes through at most maxBytes; the metadata we read lives in the page's <head>.
export function limitBody(response: Response, maxBytes: number) {
  if (!response.body) return response

  let received = 0
  const capped = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const room = maxBytes - received
        if (room <= 0) return controller.terminate()

        received += chunk.byteLength
        controller.enqueue(
          chunk.byteLength > room ? chunk.subarray(0, room) : chunk
        )
      },
    })
  )

  return new Response(capped, response)
}

function metaKey(element: Element) {
  return (
    element.getAttribute('property') ??
    element.getAttribute('name') ??
    ''
  ).toLowerCase()
}

function firstMeta(metas: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = metas.get(key)?.trim()
    if (value) return value
  }
  return null
}

export function toHexColor(value: string | null | undefined) {
  const color = value?.trim().toLowerCase()
  if (!color) return null
  if (/^#[0-9a-f]{6}$/.test(color)) return color

  const short = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  return short
    ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
    : null
}

function clip(value: string | null, max: number) {
  if (!value) return null
  const text = value.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

function absolute(href: string | undefined, base: string) {
  if (!href) return null
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

async function collect(response: Response) {
  const collected: Collected = { title: '', metas: new Map() }
  let inTitle = false

  await new HTMLRewriter()
    .on('title', {
      element(element) {
        inTitle = true
        element.onEndTag(() => {
          inTitle = false
        })
      },
      text(chunk) {
        if (inTitle) collected.title += chunk.text
      },
    })
    .on('meta', {
      element(element) {
        const key = metaKey(element)
        const content = element.getAttribute('content')
        if (key && content && !collected.metas.has(key)) {
          collected.metas.set(key, content)
        }
        if (key === 'og:title' && content) collected.ogTitle = content
      },
    })
    .on('link[rel][href]', {
      element(element) {
        const rel = element.getAttribute('rel')?.toLowerCase() ?? ''
        const href = element.getAttribute('href') ?? undefined
        if (rel.includes('icon') && !collected.iconHref)
          collected.iconHref = href
        if (rel === 'manifest' && !collected.manifestHref) {
          collected.manifestHref = href
        }
      },
    })
    .transform(response)
    .arrayBuffer()

  return collected
}

async function manifestColor(href: string | null) {
  if (!href) return null
  try {
    const response = await fetch(href, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const manifest = await limitBody(response, MAX_MANIFEST_BYTES).json<{
      theme_color?: string
    }>()
    return toHexColor(manifest.theme_color)
  } catch {
    return null
  }
}

// Same heuristics as the Python service: title, description, og:image or icon, theme colour.
export async function scrapePreview(url: string): Promise<WebsitePreview> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw new UnreachableError(url)
  }

  const isHtml = response.headers.get('content-type')?.includes('html')
  if (!response.ok || !isHtml) throw new UnreachableError(url)

  const base = response.url || url
  const page = await collect(limitBody(response, MAX_PAGE_BYTES))
  const metaColor =
    firstMeta(page.metas, COLOR_KEYS) ?? page.metas.get('theme-color')

  return {
    url,
    name: clip(page.title || page.ogTitle || null, WEBSITE_LIMITS.nameMax),
    description: clip(
      firstMeta(page.metas, DESCRIPTION_KEYS),
      WEBSITE_LIMITS.descriptionMax
    ),
    faviconUrl:
      absolute(firstMeta(page.metas, IMAGE_KEYS) ?? undefined, base) ??
      absolute(page.iconHref, base),
    color:
      (await manifestColor(absolute(page.manifestHref, base))) ??
      toHexColor(metaColor),
  }
}
