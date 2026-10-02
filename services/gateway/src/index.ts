import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  CATALOG: Fetcher
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

app.all('/v1/*', async (c) => {
  const response = await c.env.CATALOG.fetch(c.req.raw)
  // Copy the response so the CORS middleware can add its headers.
  return new Response(response.body, response)
})

export default app
