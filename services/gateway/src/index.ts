import type { ApiErrorResponse } from '@nosnocabo/contract'
import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  CATALOG: Fetcher
  SUBMIT_LIMITER: RateLimit
  PREVIEW_LIMITER: RateLimit
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

const RATE_LIMITED: ApiErrorResponse = {
  error: {
    code: 'rate_limited',
    message: 'Muitas tentativas. Espere um minuto e tente de novo.',
  },
}

function limitPerIp(
  limiter: keyof Pick<Env, 'SUBMIT_LIMITER' | 'PREVIEW_LIMITER'>
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
    const { success } = await c.env[limiter].limit({ key: ip })
    if (success) return next()

    return c.json(RATE_LIMITED, 429)
  }
}

app.post('/v1/websites', limitPerIp('SUBMIT_LIMITER'))
// The preview makes the Worker fetch any URL, so it is limited too.
app.get('/v1/websites/preview', limitPerIp('PREVIEW_LIMITER'))

app.all('/v1/*', async (c) => {
  const response = await c.env.CATALOG.fetch(c.req.raw)
  // Copy the response so the CORS middleware can add its headers.
  return new Response(response.body, response)
})

export default app
