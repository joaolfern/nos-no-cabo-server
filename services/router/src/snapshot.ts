import type { RingSite } from '../../catalog/src/rpc'

type RingCacheDeps = {
  fetchVersion: () => Promise<number>
  fetchRing: () => Promise<{ version: number; sites: RingSite[] }>
  now: () => number
  ttlMs: number
}

type Snapshot = { version: number; sites: RingSite[]; checkedAt: number }

// Lives in isolate memory: at most one version check per minute, a full fetch only on change.
export function createRingCache(deps: RingCacheDeps) {
  let snapshot: Snapshot | null = null

  async function refresh(current: Snapshot | null): Promise<Snapshot> {
    const version = await deps.fetchVersion()
    if (current && current.version === version) {
      return { ...current, checkedAt: deps.now() }
    }
    const ring = await deps.fetchRing()
    return { ...ring, checkedAt: deps.now() }
  }

  return {
    async get(): Promise<RingSite[] | null> {
      if (snapshot && deps.now() - snapshot.checkedAt < deps.ttlMs) {
        return snapshot.sites
      }
      try {
        snapshot = await refresh(snapshot)
      } catch (error) {
        console.error(error)
        if (snapshot) snapshot = { ...snapshot, checkedAt: deps.now() }
      }
      return snapshot?.sites ?? null
    },
  }
}
