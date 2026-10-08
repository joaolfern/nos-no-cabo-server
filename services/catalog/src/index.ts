import { app } from './app'
import type { Env } from './env'
import { sweepPushes } from './lib/pushNotifications'
import { handleReviewReply } from './lib/reviewReplies'

export { CatalogRpc } from './rpc'

export default {
  fetch: app.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(sweepPushes(env))
  },
  email(message, env) {
    return handleReviewReply(message, env)
  },
} satisfies ExportedHandler<Env>
