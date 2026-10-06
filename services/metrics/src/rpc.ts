import { WorkerEntrypoint } from 'cloudflare:workers'
import { type VisitKind, recordVisits } from './db'
import type { Env } from './env'
import { isBot, utcDay, visitorHash } from './visitor'

export type Click = {
  websiteId: string
  sourceId?: string
  ip: string
  userAgent: string
}

export async function recordClick(env: Env, click: Click, now: number) {
  if (isBot(click.userAgent)) return

  const day = utcDay(now)
  const visitor = await visitorHash(
    env.VISITOR_SALT,
    day,
    click.ip,
    click.userAgent
  )
  const visits: { websiteId: string; kind: VisitKind }[] = [
    { websiteId: click.websiteId, kind: 'click' },
  ]
  if (click.sourceId)
    visits.push({ websiteId: click.sourceId, kind: 'referral' })

  await recordVisits(env.METRICS_DB, day, visitor, visits)
}

// Reached only through service bindings: the router records each redirect here.
export class MetricsRpc extends WorkerEntrypoint<Env> {
  recordClick(click: Click) {
    return recordClick(this.env, click, Date.now())
  }
}
