import { z } from 'zod'

const Base64Url = z.string().regex(/^[A-Za-z0-9_-]+=*$/)

// The shape of the browser's `PushSubscription.toJSON()`.
export const PushSubscriptionSubmission = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1024),
  keys: z.object({
    p256dh: Base64Url.max(128),
    auth: Base64Url.max(64),
  }),
})
export type PushSubscriptionSubmission = z.input<
  typeof PushSubscriptionSubmission
>
