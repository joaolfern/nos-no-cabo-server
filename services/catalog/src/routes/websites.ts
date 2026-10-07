import {
  PushSubscriptionSubmission,
  ReportSubmission,
  WebsiteListQuery,
  WebsiteSubmission,
  normalizeUrl,
  toAbsoluteUrl,
} from '@nosnocabo/contract'
import { type Context, Hono } from 'hono'
import { flagForReview } from '../db/moderation'
import { addPushSubscription } from '../db/push'
import { addReport, flagReported } from '../db/reports'
import { getNeighbours } from '../db/ring'
import {
  InvalidCursorError,
  findByNormalizedUrl,
  getStatuses,
  getWebsite,
  insertWebsite,
  listWebsites,
} from '../db/websites'
import type { AppContext } from '../env'
import { NO_STORE, PUBLIC_LIST_CACHE } from '../lib/cache'
import { apiError, duplicateError } from '../lib/errors'
import { sendReportAlert } from '../lib/alerts'
import { hashIp } from '../lib/ipHash'
import { isPushServiceEndpoint } from '../lib/pushNotifications'
import { UnreachableError, scrapePreview } from '../lib/scrape'
import { TURNSTILE_HEADER, verifyTurnstile } from '../lib/turnstile'
import { ulid } from '../lib/ulid'

const MAX_STATUS_IDS = 50

export const websites = new Hono<AppContext>()

function turnstileError(c: Context) {
  return apiError(
    c,
    400,
    'turnstile_failed',
    'Não conseguimos confirmar que você não é um robô.'
  )
}

async function existingListing(db: D1Database, urlNormalized: string) {
  const existing = await findByNormalizedUrl(db, urlNormalized)
  return existing && existing.status !== 'rejected' ? existing : null
}

websites.get('/preview', async (c) => {
  const url = toAbsoluteUrl(c.req.query('url') ?? '')
  const urlNormalized = url && normalizeUrl(url)
  if (!url || !urlNormalized) {
    return apiError(c, 422, 'invalid', 'Endereço inválido.')
  }

  const existing = await existingListing(c.env.DB, urlNormalized)
  if (existing) return duplicateError(c, existing.id)

  try {
    return c.json(await scrapePreview(url))
  } catch (error) {
    if (!(error instanceof UnreachableError)) throw error
    return apiError(c, 422, 'unreachable', 'Não conseguimos acessar esse site.')
  }
})

websites.get('/status', async (c) => {
  const ids = (c.req.query('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_STATUS_IDS)

  c.header('cache-control', NO_STORE)
  return c.json(await getStatuses(c.env.DB, ids))
})

websites.get('/:id/neighbours', async (c) => {
  const neighbours = await getNeighbours(c.env.DB, c.req.param('id'))
  if (!neighbours) return apiError(c, 404, 'not_found', 'Site não encontrado.')

  c.header('cache-control', PUBLIC_LIST_CACHE)
  return c.json(neighbours)
})

websites.post('/:id/reports', async (c) => {
  const body = await c.req.json().catch(() => null)
  const report = ReportSubmission.safeParse(body)
  if (!report.success) {
    return apiError(c, 422, 'invalid', 'Escolha um motivo para a denúncia.')
  }

  const ip = c.req.header('cf-connecting-ip')
  const isHuman = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    c.req.header(TURNSTILE_HEADER),
    ip
  )
  if (!isHuman) return turnstileError(c)

  const websiteId = c.req.param('id')
  const website = await getWebsite(c.env.DB, websiteId)
  if (website?.status !== 'published') {
    return apiError(c, 404, 'not_found', 'Site não encontrado.')
  }

  await addReport(c.env.DB, {
    websiteId,
    reason: report.data.reason,
    comment: report.data.comment || null,
    reporterIpHash: await hashIp(ip ?? 'unknown', c.env.IP_HASH_SALT),
  })
  if (await flagReported(c.env.DB, websiteId)) {
    c.executionCtx.waitUntil(
      sendReportAlert(c.env, {
        website: { id: websiteId, name: website.name, url: website.url },
        reason: report.data.reason,
        comment: report.data.comment,
      })
    )
  }

  return c.body(null, 202)
})

websites.post('/:id/subscriptions', async (c) => {
  const body = await c.req.json().catch(() => null)
  const subscription = PushSubscriptionSubmission.safeParse(body)
  if (
    !subscription.success ||
    !isPushServiceEndpoint(subscription.data.endpoint)
  ) {
    return apiError(c, 422, 'invalid', 'Inscrição de notificação inválida.')
  }

  const { endpoint, keys } = subscription.data
  const added = await addPushSubscription(c.env.DB, c.req.param('id'), {
    endpoint,
    ...keys,
  })
  if (!added) {
    return apiError(c, 404, 'not_found', 'Site não está em análise.')
  }

  return c.body(null, 204)
})

websites.get('/:id', async (c) => {
  const website = await getWebsite(c.env.DB, c.req.param('id'))
  if (!website) return apiError(c, 404, 'not_found', 'Site não encontrado.')

  c.header('cache-control', NO_STORE)
  return c.json(website)
})

websites.get('/', async (c) => {
  const query = WebsiteListQuery.safeParse(c.req.query())
  if (!query.success) {
    return apiError(c, 422, 'invalid', 'Parâmetros de busca inválidos.')
  }

  try {
    const page = await listWebsites(c.env.DB, query.data)
    c.header('cache-control', PUBLIC_LIST_CACHE)
    return c.json(page)
  } catch (error) {
    if (!(error instanceof InvalidCursorError)) throw error
    return apiError(c, 422, 'invalid', 'Parâmetros de busca inválidos.')
  }
})

websites.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const submission = WebsiteSubmission.safeParse(body)
  if (!submission.success) {
    return apiError(c, 422, 'invalid', 'Confira os campos do formulário.')
  }

  const ip = c.req.header('cf-connecting-ip')
  const isHuman = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    c.req.header(TURNSTILE_HEADER),
    ip
  )
  if (!isHuman) return turnstileError(c)

  const url = toAbsoluteUrl(submission.data.url) as string
  const urlNormalized = normalizeUrl(url) as string
  const existing = await existingListing(c.env.DB, urlNormalized)
  if (existing) return duplicateError(c, existing.id)

  const now = Date.now()
  const submitterIpHash = await hashIp(ip ?? 'unknown', c.env.IP_HASH_SALT)
  const id = ulid(now)

  await insertWebsite(c.env.DB, {
    ...submission.data,
    id,
    url,
    urlNormalized,
    status: 'checking',
    submittedAt: now,
    publishedAt: null,
    submitterIpHash,
  })

  try {
    await c.env.MODERATION_QUEUE.send({ websiteId: id })
  } catch (error) {
    console.error(error)
    await flagForReview(c.env.DB, id, 'model_error')
  }

  return c.json(await getWebsite(c.env.DB, id), 202)
})
