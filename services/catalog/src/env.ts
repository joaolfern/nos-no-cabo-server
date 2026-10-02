export type Env = {
  DB: D1Database
  TURNSTILE_SECRET: string
  IP_HASH_SALT: string
  AUTO_PUBLISH?: string
}

export type AppContext = { Bindings: Env }
