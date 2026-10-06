import type { MetricsUpdate, RankInput } from '../../catalog/src/rpc'
import type { SiteTotals } from './db'

const PUSH_CHUNK = 100

// ADR 0004: recent clicks weigh 3×, and the logs keep one viral site from burying the rest.
export function rankScore(
  clicks30d: number,
  clicks: number,
  verified: boolean
) {
  return 3 * Math.log1p(clicks30d) + Math.log1p(clicks) + (verified ? 2 : 0)
}

const rounded = (score: number) => Math.round(score * 1e6) / 1e6

export function changedMetrics(
  inputs: RankInput[],
  totals: SiteTotals[]
): MetricsUpdate[] {
  const totalsById = new Map(totals.map((total) => [total.websiteId, total]))

  return inputs.flatMap((input) => {
    const total = totalsById.get(input.id)
    const score = rounded(
      rankScore(total?.clicks30d ?? 0, total?.clicks ?? 0, input.verified)
    )
    const likes = total?.netLikes ?? 0

    if (score === rounded(input.rankScore) && likes === input.likes) return []
    return [{ id: input.id, rankScore: score, likes }]
  })
}

export type RankDeps = {
  getRankInputs: () => Promise<RankInput[]>
  getTotals: () => Promise<SiteTotals[]>
  setMetrics: (updates: MetricsUpdate[]) => Promise<void>
}

export async function pushRanks(deps: RankDeps) {
  const [inputs, totals] = await Promise.all([
    deps.getRankInputs(),
    deps.getTotals(),
  ])
  const updates = changedMetrics(inputs, totals)

  for (let start = 0; start < updates.length; start += PUSH_CHUNK) {
    await deps.setMetrics(updates.slice(start, start + PUSH_CHUNK))
  }
  return updates.length
}
