import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModerationResult } from '../src/rpc'
import { SUBMISSION, get, submit } from './api'

const SAFE: ModerationResult = {
  decision: 'publish',
  verdict: 'safe',
  categoriesFlagged: [],
  model: 'test-model',
}

async function submitted() {
  return (await (await submit(SUBMISSION)).json()) as Website
}

async function reviewFlag(id: string) {
  const row = await env.DB.prepare(
    'SELECT review_flag FROM websites WHERE id = ?'
  )
    .bind(id)
    .first<{ review_flag: string | null }>()
  return row?.review_flag
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('submission', () => {
  it('stays checking and sends the site to the moderation queue', async () => {
    const send = vi.spyOn(env.MODERATION_QUEUE, 'send')
    const website = await submitted()

    expect(website.status).toBe('checking')
    expect(send).toHaveBeenCalledWith({ websiteId: website.id })
  })

  it('flags the site for review when the queue is unavailable', async () => {
    vi.spyOn(env.MODERATION_QUEUE, 'send').mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const website = await submitted()

    expect(website.status).toBe('checking')
    expect(await reviewFlag(website.id)).toBe('model_error')
  })
})

describe('CatalogRpc', () => {
  it('returns what moderation needs', async () => {
    const website = await submitted()

    expect(await exports.CatalogRpc.getForModeration(website.id)).toEqual({
      id: website.id,
      url: website.url,
      name: SUBMISSION.name,
      description: SUBMISSION.description,
      categories: SUBMISSION.categories,
      status: 'checking',
    })
    expect(await exports.CatalogRpc.getForModeration('nope')).toBeNull()
  })

  it('publishes with a short code and records the verdict', async () => {
    const website = await submitted()

    expect(await exports.CatalogRpc.applyModeration(website.id, SAFE)).toBe(
      true
    )

    const published = (await (
      await get(`/websites/${website.id}`)
    ).json()) as Website
    expect(published.status).toBe('published')
    expect(published.publishedAt).not.toBeNull()
    expect(published.shortCode).toMatch(/^[0-9A-Za-z]{6}$/)

    const result = await env.DB.prepare(
      'SELECT verdict, model FROM moderation_results WHERE website_id = ?'
    )
      .bind(website.id)
      .first()
    expect(result).toEqual({ verdict: 'safe', model: 'test-model' })
  })

  it('rejects with a reason', async () => {
    const website = await submitted()

    await exports.CatalogRpc.applyModeration(website.id, {
      ...SAFE,
      decision: 'reject',
      reason: 'unsafe',
      verdict: 'unsafe',
      categoriesFlagged: ['S10'],
    })

    const [entry] = await (
      await get(`/websites/status?ids=${website.id}`)
    ).json<unknown[]>()
    expect(entry).toEqual({
      id: website.id,
      status: 'rejected',
      rejectionReason: 'unsafe',
    })
  })

  it('holds a site for manual review without changing its status', async () => {
    const website = await submitted()

    await exports.CatalogRpc.applyModeration(website.id, {
      ...SAFE,
      decision: 'hold',
      flag: 'unreachable',
      verdict: 'error',
    })

    expect(await reviewFlag(website.id)).toBe('unreachable')
    const held = (await (
      await get(`/websites/${website.id}`)
    ).json()) as Website
    expect(held.status).toBe('checking')
  })

  it('ignores a retried decision once the site left checking', async () => {
    const website = await submitted()
    await exports.CatalogRpc.applyModeration(website.id, SAFE)

    expect(
      await exports.CatalogRpc.applyModeration(website.id, {
        ...SAFE,
        decision: 'reject',
        reason: 'unsafe',
      })
    ).toBe(false)

    const results = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM moderation_results'
    ).first<{ total: number }>()
    expect(results?.total).toBe(1)
  })
})
