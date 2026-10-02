import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { deferModeration, takeModerationBacklog } from '../src/db/moderation'
import { dailyQuotaUsed, takeDailyQuota } from '../src/db/quota'
import { SUBMISSION, submit } from './api'

const DAY = Date.UTC(2026, 9, 2, 12)
const NEXT_DAY = Date.UTC(2026, 9, 3, 0, 5)

async function submitted(url: string) {
  return ((await (await submit({ ...SUBMISSION, url })).json()) as Website).id
}

describe('daily quota', () => {
  it('grants calls up to the limit, then refuses', async () => {
    const grants = []
    for (let i = 0; i < 4; i++) {
      grants.push(await takeDailyQuota(env.DB, 'ai_checks', 3, DAY))
    }

    expect(grants).toEqual([true, true, true, false])
    expect(await dailyQuotaUsed(env.DB, 'ai_checks', DAY)).toBe(3)
  })

  it('starts over each UTC day and drops older days', async () => {
    await takeDailyQuota(env.DB, 'ai_checks', 1, DAY)

    expect(await takeDailyQuota(env.DB, 'ai_checks', 1, NEXT_DAY)).toBe(true)
    const { results } = await env.DB.prepare(
      "SELECT name FROM counters WHERE name LIKE 'ai_checks:%'"
    ).all<{ name: string }>()
    expect(results.map(({ name }) => name)).toEqual(['ai_checks:2026-10-03'])
  })
})

describe('moderation backlog', () => {
  it('hands back deferred sites oldest first, each once', async () => {
    const first = await submitted('primeiro.dev')
    const second = await submitted('segundo.dev')
    const third = await submitted('terceiro.dev')
    await deferModeration(env.DB, second, DAY)
    await deferModeration(env.DB, first, DAY - 1000)
    await deferModeration(env.DB, third, DAY + 1000)
    await deferModeration(env.DB, first, DAY + 5000)

    expect(await takeModerationBacklog(env.DB, 2)).toEqual([first, second])
    expect(await takeModerationBacklog(env.DB, 2)).toEqual([third])
    expect(await takeModerationBacklog(env.DB, 2)).toEqual([])
  })

  it('only defers sites still waiting for a decision', async () => {
    const id = await submitted('decidido.dev')
    await env.DB.prepare(
      "UPDATE websites SET status = 'published' WHERE id = ?"
    )
      .bind(id)
      .run()

    await deferModeration(env.DB, id, DAY)
    expect(await takeModerationBacklog(env.DB, 5)).toEqual([])
  })
})

describe('CatalogRpc budget methods', () => {
  it('lets the moderation Worker spend quota and park sites for tomorrow', async () => {
    const id = await submitted('rpc.dev')

    expect(await exports.CatalogRpc.takeDailyQuota('ai_checks', 1)).toBe(true)
    expect(await exports.CatalogRpc.takeDailyQuota('ai_checks', 1)).toBe(false)
    expect(await exports.CatalogRpc.dailyQuotaUsed('ai_checks')).toBe(1)

    await exports.CatalogRpc.deferModeration(id)
    expect(await exports.CatalogRpc.takeModerationBacklog(10)).toEqual([id])
  })
})
