import {
  type ApiErrorCode,
  type ApiErrorResponse,
  VoteSubmission,
} from '@nosnocabo/contract'
import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { getStats, setVote } from './db'
import type { Env } from './env'
import { TURNSTILE_HEADER } from './turnstile'
import { utcDay, voterHash } from './visitor'

// Browsers must not cache: a vote has to show up on the next read.
const STATS_CACHE = 'public, max-age=0, s-maxage=30'

export type AppDeps = {
  isPublished: (id: string) => Promise<boolean>
  setLikes: (id: string, likes: number) => Promise<void>
  isHuman: (
    token: string | undefined,
    ip: string | undefined
  ) => Promise<boolean>
  now: () => number
}

function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string
) {
  const body: ApiErrorResponse = { error: { code, message } }
  return c.json(body, status)
}

export function createApp(depsFor: (env: Env) => AppDeps) {
  const app = new Hono<{ Bindings: Env }>().basePath('/v1')

  app.get('/websites/:id/stats', async (c) => {
    const today = utcDay(depsFor(c.env).now())
    const stats = await getStats(c.env.METRICS_DB, c.req.param('id'), today)
    c.header('cache-control', STATS_CACHE)
    return c.json(stats)
  })

  app.post('/websites/:id/votes', async (c) => {
    const deps = depsFor(c.env)
    const body = await c.req.json().catch(() => null)
    const vote = VoteSubmission.safeParse(body)
    if (!vote.success) return apiError(c, 422, 'invalid', 'Voto inválido.')

    const isHuman = await deps.isHuman(
      c.req.header(TURNSTILE_HEADER),
      c.req.header('cf-connecting-ip')
    )
    if (!isHuman) {
      return apiError(
        c,
        400,
        'turnstile_failed',
        'Não conseguimos confirmar que você não é um robô.'
      )
    }

    const websiteId = c.req.param('id')
    if (!(await deps.isPublished(websiteId))) {
      return apiError(c, 404, 'not_found', 'Site não encontrado.')
    }

    const now = deps.now()
    const voter = await voterHash(c.env.VISITOR_SALT, vote.data.voterId)
    await setVote(c.env.METRICS_DB, websiteId, voter, vote.data.value, now)

    const stats = await getStats(c.env.METRICS_DB, websiteId, utcDay(now))
    // The hourly push corrects a failed one, so the vote still succeeds.
    await deps.setLikes(websiteId, stats.likes - stats.dislikes).catch(() => {})

    c.header('cache-control', 'no-store')
    return c.json(stats)
  })

  return app
}
