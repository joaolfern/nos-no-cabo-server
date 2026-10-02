import type { VerificationResult } from '@nosnocabo/contract'
import type {
  VerificationKind,
  VerificationTarget,
} from '../../catalog/src/rpc'

export type VerifyDeps = {
  getTarget: (id: string) => Promise<VerificationTarget | null>
  claim: (id: string) => Promise<boolean>
  fetchPage: (url: string) => Promise<Response | null>
  detect: (page: Response, id: string) => Promise<boolean>
  record: (id: string, found: boolean, kind: VerificationKind) => Promise<void>
  dueForRecheck: (limit: number) => Promise<{ id: string; url: string }[]>
  now: () => number
}

export type VerifyOutcome =
  | { kind: 'not_found' }
  | { kind: 'cooldown' }
  | { kind: 'result'; result: VerificationResult }

// A manual check can only grant the badge; only the re-check removes it (ADR 0001).
export async function verify(
  id: string,
  deps: VerifyDeps
): Promise<VerifyOutcome> {
  const target = await deps.getTarget(id)
  if (target?.status !== 'published') return { kind: 'not_found' }
  if (!(await deps.claim(id))) return { kind: 'cooldown' }

  const page = await deps.fetchPage(target.url)
  if (!page) {
    return {
      kind: 'result',
      result: {
        verified: false,
        verifiedAt: target.verifiedAt,
        reason: 'unreachable',
      },
    }
  }
  if (!(await deps.detect(page, id))) {
    return {
      kind: 'result',
      result: {
        verified: false,
        verifiedAt: target.verifiedAt,
        reason: 'widget_not_found',
      },
    }
  }

  await deps.record(id, true, 'manual')
  return {
    kind: 'result',
    result: {
      verified: true,
      verifiedAt: target.verifiedAt ?? new Date(deps.now()).toISOString(),
    },
  }
}

export async function recheckDue(deps: VerifyDeps, limit: number) {
  for (const site of await deps.dueForRecheck(limit)) {
    try {
      const page = await deps.fetchPage(site.url)
      const found = page ? await deps.detect(page, site.id) : false
      await deps.record(site.id, found, 'recheck')
    } catch (error) {
      console.error(error)
    }
  }
}
