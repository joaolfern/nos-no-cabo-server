export type ModerationJob = { websiteId: string }

import type { AlertEnv } from './lib/alerts'
import type { PushEnv } from './lib/pushNotifications'

export type Env = AlertEnv &
  PushEnv & {
    DB: D1Database
    MODERATION_QUEUE: Queue<ModerationJob>
    TURNSTILE_SECRET: string
    IP_HASH_SALT: string
  }

export type AppContext = { Bindings: Env }
