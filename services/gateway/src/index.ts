import type {
  WebsiteNeighbours,
  WebsitePage,
  WebsiteStats,
} from '@nosnocabo/contract'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  CATALOG: Fetcher
  VERIFICATION: Fetcher
  METRICS: Fetcher
  ALLOWED_ORIGINS: string
}

const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.nosnocabo\.pages\.dev$/

function isAllowedOrigin(origin: string, allowed: string) {
  return allowed.split(',').includes(origin) || PREVIEW_ORIGIN.test(origin)
}

export const app = new Hono<{ Bindings: Env }>()

app.use('/v1/*', (c, next) =>
  cors({
    origin: (origin) =>
      isAllowedOrigin(origin, c.env.ALLOWED_ORIGINS) ? origin : null,
    allowHeaders: ['content-type', 'cf-turnstile-response'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  })(c, next)
)

// Copy each response so the CORS middleware can add its headers.
const forward = async (service: Fetcher, request: Request) => {
  const response = await service.fetch(request)
  return new Response(response.body, response)
}

app.post('/v1/websites/:id/verify', (c) =>
  forward(c.env.VERIFICATION, c.req.raw)
)
const NO_NEIGHBOURS: WebsiteNeighbours = {
  previous: null,
  next: null,
  random: null,
}

async function jsonOrNull<T>(response: Promise<Response>) {
  try {
    const result = await response
    return result.ok ? ((await result.json()) as T) : null
  } catch {
    return null
  }
}

// One public request for the website page; calls between Workers don't count toward the daily limit.
app.get('/v1/websites/:id/page', async (c) => {
  const base = `/v1/websites/${encodeURIComponent(c.req.param('id'))}`
  const at = (path: string) => new URL(`${base}${path}`, c.req.url)

  const [website, neighbours, stats] = await Promise.all([
    c.env.CATALOG.fetch(at('')),
    jsonOrNull<WebsiteNeighbours>(c.env.CATALOG.fetch(at('/neighbours'))),
    jsonOrNull<WebsiteStats>(c.env.METRICS.fetch(at('/stats'))),
  ])
  if (!website.ok) return new Response(website.body, website)

  const page: WebsitePage = {
    website: await website.json(),
    neighbours: neighbours ?? NO_NEIGHBOURS,
    stats,
  }
  c.header('cache-control', 'no-store')
  return c.json(page)
})
app.get('/v1/websites/:id/stats', (c) => forward(c.env.METRICS, c.req.raw))
app.post('/v1/websites/:id/votes', (c) => forward(c.env.METRICS, c.req.raw))
app.all('/v1/*', (c) => forward(c.env.CATALOG, c.req.raw))

export default app
