import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  type ModerationResult,
  applyModeration,
  deferModeration,
  getForModeration,
  takeModerationBacklog,
} from './db/moderation'
import { dailyQuotaUsed, takeDailyQuota } from './db/quota'
import { getRing, getRingVersion } from './db/ring'
import {
  type VerificationKind,
  claimVerificationCheck,
  dueForRecheck,
  getVerificationTarget,
  recordVerification,
} from './db/verification'
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

  takeDailyQuota(name: string, limit: number) {
    return takeDailyQuota(this.env.DB, name, limit)
  }

  dailyQuotaUsed(name: string) {
    return dailyQuotaUsed(this.env.DB, name)
  }

  deferModeration(id: string) {
    return deferModeration(this.env.DB, id)
  }

  takeModerationBacklog(limit: number) {
    return takeModerationBacklog(this.env.DB, limit)
  }

  getVerificationTarget(id: string) {
    return getVerificationTarget(this.env.DB, id)
  }

  claimVerificationCheck(id: string) {
    return claimVerificationCheck(this.env.DB, id)
  }

  recordVerification(id: string, found: boolean, kind: VerificationKind) {
    return recordVerification(this.env.DB, id, found, kind)
  }

  dueForRecheck(limit: number) {
    return dueForRecheck(this.env.DB, limit)
  }
}

export type { ModerationResult, WebsiteForModeration } from './db/moderation'
export type { RingSite } from './db/ring'
export type { VerificationKind, VerificationTarget } from './db/verification'
