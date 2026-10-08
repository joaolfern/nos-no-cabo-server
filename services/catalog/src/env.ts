export type ModerationJob = { websiteId: string }

import type { AlertEnv } from './lib/alerts'
import type { PushEnv } from './lib/pushNotifications'
import type { ReviewReplyEnv } from './lib/reviewReplies'

export type Env = AlertEnv &
  PushEnv &
  ReviewReplyEnv & {
    DB: D1Database
    MODERATION_QUEUE: Queue<ModerationJob>
    TURNSTILE_SECRET: string
    IP_HASH_SALT: string
  }

export type AppContext = { Bindings: Env }
