import { createApp } from './app'
import { allTotals, deleteOldVisits } from './db'
import type { Env } from './env'
import { pushRanks } from './rank'
import { verifyTurnstile } from './turnstile'
import { utcDay } from './visitor'

export { MetricsRpc } from './rpc'
export type { Click } from './rpc'

const app = createApp((env) => ({
  isPublished: (id) => env.CATALOG.isPublished(id),
  setLikes: (id, likes) => env.CATALOG.setMetrics([{ id, likes }]),
  isHuman: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip),
  now: () => Date.now(),
}))

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: Env) {
    const today = utcDay(Date.now())
    await pushRanks({
      getRankInputs: () => env.CATALOG.getRankInputs(),
      getTotals: () => allTotals(env.METRICS_DB, today),
      setMetrics: (updates) => env.CATALOG.setMetrics(updates),
    })
    await deleteOldVisits(env.METRICS_DB, today)
  },
} satisfies ExportedHandler<Env>
