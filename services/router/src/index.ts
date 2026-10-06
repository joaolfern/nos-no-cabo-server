import { createApp } from './app'
import type { Env } from './env'
import { createRingCache } from './snapshot'

const VERSION_CHECK_MS = 60_000

let ringCache: ReturnType<typeof createRingCache> | null = null

function ringFor(env: Env) {
  ringCache ??= createRingCache({
    fetchVersion: () => env.CATALOG.getRingVersion(),
    fetchRing: () => env.CATALOG.getRing(),
    now: () => Date.now(),
    ttlMs: VERSION_CHECK_MS,
  })
  return ringCache
}

export default {
  fetch(request, env, ctx) {
    const app = createApp({
      getSites: () => ringFor(env).get(),
      homeUrl: () => env.HOME_URL,
      random: Math.random,
      recordClick: (click) =>
        ctx.waitUntil(env.METRICS.recordClick(click).catch(() => {})),
    })
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
