import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { deleteOldVisits, getStats } from '../src/db'
import { type Click, recordClick } from '../src/rpc'

const DAY = Date.parse('2026-10-05T12:00:00Z')
const NEXT_DAY = Date.parse('2026-10-06T09:00:00Z')
const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0'

const click = (fields: Partial<Click> = {}): Click => ({
  websiteId: 'alvo',
  ip: '203.0.113.7',
  userAgent: BROWSER,
  ...fields,
})

const stats = (id: string, today = '2026-10-06') =>
  getStats(env.METRICS_DB, id, today)

describe('recordClick', () => {
  it('counts a visitor once per site per day', async () => {
    await recordClick(env, click(), DAY)
    await recordClick(env, click(), DAY)
    await recordClick(env, click({ ip: '198.51.100.9' }), DAY)
    await recordClick(env, click(), NEXT_DAY)

    expect(await stats('alvo')).toMatchObject({ clicks: 3, clicks30d: 3 })
  })

  it('treats a different browser on the same network as another visitor', async () => {
    await recordClick(env, click(), DAY)
    await recordClick(
      env,
      click({ userAgent: 'Mozilla/5.0 (iPhone) Safari/18' }),
      DAY
    )

    expect(await stats('alvo')).toMatchObject({ clicks: 2 })
  })

  it('credits the site the visitor came from with a referral', async () => {
    await recordClick(env, click({ sourceId: 'origem' }), DAY)

    expect(await stats('alvo')).toMatchObject({ clicks: 1, referrals: 0 })
    expect(await stats('origem')).toMatchObject({ clicks: 0, referrals: 1 })
  })

  it.each([
    'WhatsApp/2.23.20',
    'Mozilla/5.0 (compatible; Googlebot/2.1)',
    'Discordbot/2.0',
    'curl/8.5.0',
    '',
  ])('ignores the bot or link preview %j', async (userAgent) => {
    await recordClick(env, click({ userAgent }), DAY)

    expect(await stats('alvo')).toMatchObject({ clicks: 0 })
  })

  it('keeps the counts after old dedupe rows are deleted', async () => {
    await recordClick(env, click(), DAY)
    await deleteOldVisits(env.METRICS_DB, '2026-10-06')

    const { count } = (await env.METRICS_DB.prepare(
      'SELECT count(*) AS count FROM visits'
    ).first<{ count: number }>()) ?? { count: -1 }
    expect(count).toBe(0)
    expect(await stats('alvo')).toMatchObject({ clicks: 1 })
  })

  it('counts only the last 30 days as recent', async () => {
    await recordClick(env, click(), Date.parse('2026-09-06T12:00:00Z'))
    await recordClick(env, click(), Date.parse('2026-09-07T12:00:00Z'))

    expect(await stats('alvo', '2026-10-06')).toMatchObject({
      clicks: 2,
      clicks30d: 1,
    })
  })

  it('never stores the raw IP', async () => {
    await recordClick(env, click(), DAY)

    const row = await env.METRICS_DB.prepare(
      'SELECT visitor_hash FROM visits'
    ).first<{ visitor_hash: string }>()
    expect(row?.visitor_hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
