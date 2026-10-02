import { describe, expect, it, vi } from 'vitest'
import type { RingSite } from '../../catalog/src/rpc'
import { createRingCache } from '../src/snapshot'

const sites = (id: string): RingSite[] => [
  { id, url: `https://${id}.dev/`, shortCode: null },
]

function setup() {
  let now = 0
  let version = 1
  const deps = {
    fetchVersion: vi.fn(async () => version),
    fetchRing: vi.fn(async () => ({ version, sites: sites(`v${version}`) })),
    now: () => now,
    ttlMs: 60_000,
  }
  return {
    deps,
    cache: createRingCache(deps),
    advance: (ms: number) => (now += ms),
    bump: () => (version += 1),
  }
}

describe('ring cache', () => {
  it('loads once, then trusts the snapshot for a minute', async () => {
    const { deps, cache, advance } = setup()

    expect(await cache.get()).toEqual(sites('v1'))
    advance(30_000)
    await cache.get()

    expect(deps.fetchRing).toHaveBeenCalledTimes(1)
    expect(deps.fetchVersion).toHaveBeenCalledTimes(1)
  })

  it('after a minute, refetches only when the version changed', async () => {
    const { deps, cache, advance, bump } = setup()
    await cache.get()

    advance(61_000)
    expect(await cache.get()).toEqual(sites('v1'))
    expect(deps.fetchRing).toHaveBeenCalledTimes(1)

    bump()
    advance(61_000)
    expect(await cache.get()).toEqual(sites('v2'))
    expect(deps.fetchRing).toHaveBeenCalledTimes(2)
  })

  it('keeps serving the old snapshot while the catalog is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, cache, advance } = setup()
    await cache.get()

    deps.fetchVersion.mockRejectedValue(new Error('down'))
    advance(61_000)
    expect(await cache.get()).toEqual(sites('v1'))

    advance(1_000)
    await cache.get()
    expect(deps.fetchVersion).toHaveBeenCalledTimes(2)
  })

  it('has nothing to serve if the catalog is down from the start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, cache } = setup()
    deps.fetchVersion.mockRejectedValue(new Error('down'))

    expect(await cache.get()).toBeNull()
  })
})
