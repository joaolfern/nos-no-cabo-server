import { applyD1Migrations, env } from 'cloudflare:test'
import { beforeEach } from 'vitest'

await applyD1Migrations(env.METRICS_DB, env.TEST_MIGRATIONS)

beforeEach(async () => {
  await env.METRICS_DB.batch(
    ['visits', 'daily_stats', 'site_totals', 'votes'].map((table) =>
      env.METRICS_DB.prepare(`DELETE FROM ${table}`)
    )
  )
})
