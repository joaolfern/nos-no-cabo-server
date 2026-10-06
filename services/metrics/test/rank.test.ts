import type { MetricsUpdate, RankInput } from '../../catalog/src/rpc'
import { describe, expect, it } from 'vitest'
import type { SiteTotals } from '../src/db'
import { changedMetrics, pushRanks, rankScore } from '../src/rank'

const input = (id: string, fields: Partial<RankInput> = {}): RankInput => ({
  id,
  verified: false,
  rankScore: 0,
  likes: 0,
  ...fields,
})

const totals = (
  websiteId: string,
  fields: Partial<SiteTotals> = {}
): SiteTotals => ({
  websiteId,
  clicks: 0,
  clicks30d: 0,
  netLikes: 0,
  ...fields,
})

describe('rankScore', () => {
  it('follows ADR 0004', () => {
    expect(rankScore(0, 0, false)).toBe(0)
    expect(rankScore(0, 0, true)).toBe(2)
    expect(rankScore(9, 99, false)).toBeCloseTo(
      3 * Math.log(10) + Math.log(100)
    )
  })

  it('weighs recent clicks more than old ones', () => {
    expect(rankScore(10, 10, false)).toBeGreaterThan(rankScore(0, 40, false))
  })
})

describe('changedMetrics', () => {
  it('pushes only the sites whose score or likes changed', () => {
    const same = rankScore(4, 10, false)
    const updates = changedMetrics(
      [
        input('igual', { rankScore: same, likes: 2 }),
        input('novo-clique'),
        input('verificado', { verified: true }),
        input('curtido', { likes: 1 }),
        input('sem-dados'),
      ],
      [
        totals('igual', { clicks: 10, clicks30d: 4, netLikes: 2 }),
        totals('novo-clique', { clicks: 1, clicks30d: 1 }),
        totals('curtido', { netLikes: -1 }),
        totals('fora-do-catalogo', { clicks: 5 }),
      ]
    )

    expect(updates.map(({ id }) => id)).toEqual([
      'novo-clique',
      'verificado',
      'curtido',
    ])
    expect(updates.find(({ id }) => id === 'curtido')).toEqual({
      id: 'curtido',
      rankScore: 0,
      likes: -1,
    })
  })

  it('pushes a site that lost its verification badge back down', () => {
    expect(changedMetrics([input('antigo', { rankScore: 2 })], [])).toEqual([
      { id: 'antigo', rankScore: 0, likes: 0 },
    ])
  })
})

describe('pushRanks', () => {
  it('sends the updates in chunks', async () => {
    const pushed: MetricsUpdate[][] = []
    const inputs = Array.from({ length: 250 }, (_, i) => input(`s${i}`))
    const count = await pushRanks({
      getRankInputs: async () => inputs,
      getTotals: async () => inputs.map(({ id }) => totals(id, { clicks: 1 })),
      setMetrics: async (updates) => {
        pushed.push(updates)
      },
    })

    expect(count).toBe(250)
    expect(pushed.map((chunk) => chunk.length)).toEqual([100, 100, 50])
  })
})
