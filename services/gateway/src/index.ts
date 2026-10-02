import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  CATALOG: Fetcher
  VERIFICATION: Fetcher
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
app.all('/v1/*', (c) => forward(c.env.CATALOG, c.req.raw))

export default app
