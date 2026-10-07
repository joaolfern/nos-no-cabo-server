import { app } from './app'
import type { Env } from './env'
import { sweepPushes } from './lib/pushNotifications'

export { CatalogRpc } from './rpc'

export default {
  fetch: app.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(sweepPushes(env))
  },
} satisfies ExportedHandler<Env>
