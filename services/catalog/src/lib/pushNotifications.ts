import {
  type PushJob,
  claimDecidedPushes,
  deleteExpiredPushSubscriptions,
} from '../db/push'
import { type VapidKeys, sendPush } from './webPush'

export type PushEnv = {
  DB: D1Database
  HOME_URL: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
}

const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
]

// The catalog only ever posts to a browser vendor's push service.
export function isPushServiceEndpoint(endpoint: string) {
  const { protocol, hostname } = new URL(endpoint)
  return (
    protocol === 'https:' &&
    PUSH_SERVICE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    )
  )
}

// Same tag as the open-tab notification, so the two replace each other.
export function decisionMessage(job: PushJob, homeUrl: string) {
  const isPublished = job.status === 'published'
  return {
    title: isPublished
      ? `${job.name} foi publicado`
      : `${job.name} não foi aceito`,
    body: isPublished
      ? 'Já aparece no feed do Nós no Cabo.'
      : 'Veja o motivo no Nós no Cabo.',
    url: isPublished
      ? `${homeUrl}website/${job.websiteId}`
      : `${homeUrl}websites`,
    tag: `nnc-submission-${job.websiteId}`,
  }
}

function vapidKeys(env: PushEnv): VapidKeys | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, HOME_URL } = env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null
  return {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: HOME_URL,
  }
}

// Best effort: a claimed subscription is gone even if its push fails.
export async function pushDecisions(env: PushEnv, websiteId?: string) {
  const vapid = vapidKeys(env)
  if (!vapid) return

  const jobs = await claimDecidedPushes(env.DB, websiteId)
  await Promise.all(
    jobs.map(async (job) => {
      try {
        const response = await sendPush(
          job,
          decisionMessage(job, env.HOME_URL),
          vapid
        )
        if (
          !response.ok &&
          response.status !== 404 &&
          response.status !== 410
        ) {
          console.error(
            `Push failed with ${response.status}: ${await response.text()}`
          )
        }
      } catch (error) {
        console.error(error)
      }
    })
  )
}

// Hourly: catches decisions made outside applyModeration (the review script).
export async function sweepPushes(env: PushEnv) {
  await pushDecisions(env)
  await deleteExpiredPushSubscriptions(env.DB)
}
