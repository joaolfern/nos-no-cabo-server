import type { ApiErrorCode, ApiErrorResponse } from '@nosnocabo/contract'
import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Env } from './env'
import { type VerifyDeps, verify } from './verify'

function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string
) {
  const body: ApiErrorResponse = { error: { code, message } }
  return c.json(body, status)
}

export function createApp(depsFor: (env: Env) => VerifyDeps) {
  const app = new Hono<{ Bindings: Env }>().basePath('/v1')

  app.post('/websites/:id/verify', async (c) => {
    const outcome = await verify(c.req.param('id'), depsFor(c.env))

    if (outcome.kind === 'not_found') {
      return apiError(c, 404, 'not_found', 'Site não encontrado.')
    }
    if (outcome.kind === 'cooldown') {
      return apiError(
        c,
        429,
        'rate_limited',
        'Aguarde um minuto antes de verificar de novo.'
      )
    }
    c.header('cache-control', 'no-store')
    return c.json(outcome.result)
  })

  return app
}
