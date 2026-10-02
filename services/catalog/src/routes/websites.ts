import {
  WebsiteListQuery,
  WebsiteSubmission,
  normalizeUrl,
  toAbsoluteUrl,
} from '@nosnocabo/contract'
import { Hono } from 'hono'
import {
  InvalidCursorError,
  findByNormalizedUrl,
  getNeighbours,
  getStatuses,
  getWebsite,
  insertWebsite,
  listWebsites,
} from '../db/websites'
import type { AppContext } from '../env'
import { NO_STORE, PUBLIC_LIST_CACHE } from '../lib/cache'
import { apiError, duplicateError } from '../lib/errors'
import { hashIp } from '../lib/ipHash'
import { UnreachableError, scrapePreview } from '../lib/scrape'
import { TURNSTILE_HEADER, verifyTurnstile } from '../lib/turnstile'
import { ulid } from '../lib/ulid'

const MAX_STATUS_IDS = 50

export const websites = new Hono<AppContext>()

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
  if (!isHuman) {
    return apiError(
      c,
      400,
      'turnstile_failed',
      'Não conseguimos confirmar que você não é um robô.'
    )
  }

  const url = toAbsoluteUrl(submission.data.url) as string
  const urlNormalized = normalizeUrl(url) as string
  const existing = await existingListing(c.env.DB, urlNormalized)
  if (existing) return duplicateError(c, existing.id)

  const now = Date.now()
  const autoPublish = c.env.AUTO_PUBLISH === 'true'
  const id = ulid(now)

  await insertWebsite(c.env.DB, {
    ...submission.data,
    id,
    url,
    urlNormalized,
    status: autoPublish ? 'published' : 'checking',
    submittedAt: now,
    publishedAt: autoPublish ? now : null,
    submitterIpHash: await hashIp(ip ?? 'unknown', c.env.IP_HASH_SALT),
  })

  return c.json(await getWebsite(c.env.DB, id), 202)
})
