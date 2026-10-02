import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VerificationTarget } from '../../catalog/src/rpc'
import { createApp } from '../src/app'
import { type VerifyDeps, recheckDue, verify } from '../src/verify'

const NOW = Date.UTC(2026, 9, 2, 12)
const TARGET: VerificationTarget = {
  id: '01SITE',
  url: 'https://projeto.dev/',
  status: 'published',
  verifiedAt: null,
}
const PAGE = () => new Response('<html></html>')

function fakeDeps(overrides: Partial<VerifyDeps> = {}) {
  return {
    getTarget: vi.fn(async () => TARGET),
    claim: vi.fn(async () => true),
    fetchPage: vi.fn(async () => PAGE()),
    detect: vi.fn(async () => true),
    record: vi.fn(async () => {}),
    dueForRecheck: vi.fn(async () => [] as { id: string; url: string }[]),
    now: () => NOW,
    ...overrides,
  } satisfies VerifyDeps
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('verify', () => {
  it('grants the badge when the widget is found', async () => {
    const deps = fakeDeps()

    expect(await verify('01SITE', deps)).toEqual({
      kind: 'result',
      result: { verified: true, verifiedAt: new Date(NOW).toISOString() },
    })
    expect(deps.record).toHaveBeenCalledWith('01SITE', true, 'manual')
  })

  it('reports a missing widget or an unreachable site without touching the badge', async () => {
    const missing = fakeDeps({ detect: vi.fn(async () => false) })
    expect(await verify('01SITE', missing)).toEqual({
      kind: 'result',
      result: { verified: false, verifiedAt: null, reason: 'widget_not_found' },
    })

    const verifiedAt = '2026-09-01T00:00:00.000Z'
    const unreachable = fakeDeps({
      getTarget: vi.fn(async () => ({ ...TARGET, verifiedAt })),
      fetchPage: vi.fn(async () => null),
    })
    expect(await verify('01SITE', unreachable)).toEqual({
      kind: 'result',
      result: { verified: false, verifiedAt, reason: 'unreachable' },
    })
    expect(missing.record).not.toHaveBeenCalled()
    expect(unreachable.record).not.toHaveBeenCalled()
  })

  it('refuses unknown or unpublished sites, and checks inside the cooldown', async () => {
    expect(
      await verify('nada', fakeDeps({ getTarget: vi.fn(async () => null) }))
    ).toEqual({ kind: 'not_found' })
    expect(
      await verify(
        '01SITE',
        fakeDeps({
          getTarget: vi.fn(async () => ({
            ...TARGET,
            status: 'checking' as const,
          })),
        })
      )
    ).toEqual({ kind: 'not_found' })

    const cooling = fakeDeps({ claim: vi.fn(async () => false) })
    expect(await verify('01SITE', cooling)).toEqual({ kind: 'cooldown' })
    expect(cooling.fetchPage).not.toHaveBeenCalled()
  })
})

describe('recheckDue', () => {
  it('records a re-check for each due site, counting failures as misses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = fakeDeps({
      dueForRecheck: vi.fn(async () => [
        { id: 'a', url: 'https://a.dev/' },
        { id: 'b', url: 'https://b.dev/' },
        { id: 'c', url: 'https://c.dev/' },
      ]),
      fetchPage: vi.fn(async (url: string) =>
        url.includes('b.dev') ? null : PAGE()
      ),
      detect: vi.fn(async () => true),
    })

    await recheckDue(deps, 20)

    expect(deps.dueForRecheck).toHaveBeenCalledWith(20)
    expect(deps.record).toHaveBeenNthCalledWith(1, 'a', true, 'recheck')
    expect(deps.record).toHaveBeenNthCalledWith(2, 'b', false, 'recheck')
    expect(deps.record).toHaveBeenNthCalledWith(3, 'c', true, 'recheck')
  })

  it('keeps going when one site throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = fakeDeps({
      dueForRecheck: vi.fn(async () => [
        { id: 'a', url: 'https://a.dev/' },
        { id: 'b', url: 'https://b.dev/' },
      ]),
      detect: vi.fn(async () => {
        throw new Error('parser')
      }),
    })

    await recheckDue(deps, 20)
    expect(deps.record).toHaveBeenCalledTimes(0)
    expect(deps.detect).toHaveBeenCalledTimes(2)
  })
})

describe('POST /v1/websites/:id/verify', () => {
  const call = (deps: VerifyDeps) =>
    createApp(() => deps).request('/v1/websites/01SITE/verify', {
      method: 'POST',
    })

  it('answers the verification result', async () => {
    const response = await call(fakeDeps())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ verified: true })
  })

  it('answers 404 and 429 with the API error envelope', async () => {
    const missing = await call(fakeDeps({ getTarget: vi.fn(async () => null) }))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'not_found' } })

    const cooling = await call(fakeDeps({ claim: vi.fn(async () => false) }))
    expect(cooling.status).toBe(429)
    expect(await cooling.json()).toMatchObject({
      error: { code: 'rate_limited' },
    })
  })
})
