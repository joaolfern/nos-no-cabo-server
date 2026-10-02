import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  type ModerationResult,
  applyModeration,
  getForModeration,
} from './db/moderation'
import { getRing, getRingVersion } from './db/ring'
import type { Env } from './env'

// Reached only through service bindings; the gateway forwards nothing but /v1.
export class CatalogRpc extends WorkerEntrypoint<Env> {
  getForModeration(id: string) {
    return getForModeration(this.env.DB, id)
  }

  applyModeration(id: string, result: ModerationResult) {
    return applyModeration(this.env.DB, id, result)
  }

  getRing() {
    return getRing(this.env.DB)
  }

  getRingVersion() {
    return getRingVersion(this.env.DB)
  }
}

export type { ModerationResult, WebsiteForModeration } from './db/moderation'
