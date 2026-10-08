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
import { sendModerationAlert } from './lib/alerts'
import { pushDecisions } from './lib/pushNotifications'
import {
  type MetricsUpdate,
  getRankInputs,
  isPublished,
  setMetrics,
} from './db/metrics'

// Kept off the class: every method on CatalogRpc is callable over the service binding.
async function alertOwner(env: Env, id: string, result: ModerationResult) {
  const website = await getForModeration(env.DB, id)
  if (!website) return
  const { verdict, categoriesFlagged } = result
  await sendModerationAlert(env, {
    website,
    outcome: result,
    verdict,
    categoriesFlagged,
  })
}

// Reached only through service bindings; the gateway forwards nothing but /v1.
export class CatalogRpc extends WorkerEntrypoint<Env> {
  getForModeration(id: string) {
    return getForModeration(this.env.DB, id)
  }

  async applyModeration(id: string, result: ModerationResult) {
    const changed = await applyModeration(this.env.DB, id, result)
    if (changed) {
      if (result.decision !== 'hold') {
        this.ctx.waitUntil(pushDecisions(this.env, id))
      }
      this.ctx.waitUntil(alertOwner(this.env, id, result))
    }
    return changed
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

  getRankInputs() {
    return getRankInputs(this.env.DB)
  }

  setMetrics(updates: MetricsUpdate[]) {
    return setMetrics(this.env.DB, updates)
  }

  isPublished(id: string) {
    return isPublished(this.env.DB, id)
  }
}

export type { MetricsUpdate, RankInput } from './db/metrics'
export type { ModerationResult, WebsiteForModeration } from './db/moderation'
export type { RingSite } from './db/ring'
export type { VerificationKind, VerificationTarget } from './db/verification'
