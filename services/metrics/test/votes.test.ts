import type { WebsiteStats } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { type AppDeps, createApp } from '../src/app'

const VOTER = '6f1c2b8e-4d3a-4f5e-9a7b-1c2d3e4f5a6b'
const OTHER_VOTER = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const GOOD_TOKEN = 'token-ok'

let pushedLikes: Record<string, number>
let failPush: boolean

const deps: AppDeps = {
  isPublished: async (id) => id !== 'nada',
  setLikes: async (id, likes) => {
    if (failPush) throw new Error('catalog down')
    pushedLikes[id] = likes
  },
  isHuman: async (token) => token === GOOD_TOKEN,
  now: () => Date.parse('2026-10-05T12:00:00Z'),
}

const app = createApp(() => deps)

function vote(body: unknown, { id = 'site', token = GOOD_TOKEN } = {}) {
  return app.fetch(
    new Request(`https://metrics.test/v1/websites/${id}/votes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-turnstile-response': token,
      },
      body: JSON.stringify(body),
    }),
    env
  )
}

async function stats(id = 'site') {
  const response = await app.fetch(
    new Request(`https://metrics.test/v1/websites/${id}/stats`),
    env
  )
  return (await response.json()) as WebsiteStats
}

beforeEach(() => {
  pushedLikes = {}
  failPush = false
})

describe('votes', () => {
  it('counts likes and dislikes and pushes the net value to the catalog', async () => {
    await vote({ voterId: VOTER, value: 1 })
    const response = await vote({ voterId: OTHER_VOTER, value: -1 })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ likes: 1, dislikes: 1 })
    expect(pushedLikes.site).toBe(0)
  })

  it('lets a voter switch and then remove their vote', async () => {
    await vote({ voterId: VOTER, value: 1 })
    await vote({ voterId: VOTER, value: 1 })
    expect(await stats()).toMatchObject({ likes: 1, dislikes: 0 })

    await vote({ voterId: VOTER, value: -1 })
    expect(await stats()).toMatchObject({ likes: 0, dislikes: 1 })
    expect(pushedLikes.site).toBe(-1)

    await vote({ voterId: VOTER, value: 0 })
    expect(await stats()).toMatchObject({ likes: 0, dislikes: 0 })
    expect(pushedLikes.site).toBe(0)
  })

  it('rejects an invalid body, a failed Turnstile check and an unpublished site', async () => {
    expect((await vote({ voterId: 'eu', value: 1 })).status).toBe(422)
    expect(
      (await vote({ voterId: VOTER, value: 1 }, { token: 'x' })).status
    ).toBe(400)
    expect(
      (await vote({ voterId: VOTER, value: 1 }, { id: 'nada' })).status
    ).toBe(404)
    expect(await stats()).toMatchObject({ likes: 0 })
  })

  it('keeps the vote when the catalog push fails', async () => {
    failPush = true
    const response = await vote({ voterId: VOTER, value: 1 })

    expect(response.status).toBe(200)
    expect(await stats()).toMatchObject({ likes: 1 })
  })

  it('stores the voter id hashed', async () => {
    await vote({ voterId: VOTER, value: 1 })

    const row = await env.METRICS_DB.prepare(
      'SELECT voter_hash FROM votes'
    ).first<{
      voter_hash: string
    }>()
    expect(row?.voter_hash).not.toContain(VOTER)
  })

  it('returns zeros for a site with no data', async () => {
    expect(await stats('vazio')).toEqual({
      clicks: 0,
      clicks30d: 0,
      referrals: 0,
      likes: 0,
      dislikes: 0,
    })
  })
})
