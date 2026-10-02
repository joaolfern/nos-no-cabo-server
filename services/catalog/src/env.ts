export type ModerationJob = { websiteId: string }

export type Env = {
  DB: D1Database
  MODERATION_QUEUE: Queue<ModerationJob>
  TURNSTILE_SECRET: string
  IP_HASH_SALT: string
}

export type AppContext = { Bindings: Env }
