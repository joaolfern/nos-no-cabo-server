import { z } from 'zod'

const Count = z.number().int().nonnegative()

export const WebsiteStats = z.object({
  clicks: Count,
  clicks30d: Count,
  referrals: Count,
  likes: Count,
  dislikes: Count,
})
export type WebsiteStats = z.infer<typeof WebsiteStats>

export const VoteValue = z.union([z.literal(1), z.literal(-1), z.literal(0)])
export type VoteValue = z.infer<typeof VoteValue>

export const VoteSubmission = z.object({
  voterId: z.uuid(),
  value: VoteValue,
})
export type VoteSubmission = z.infer<typeof VoteSubmission>
