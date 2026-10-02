import { z } from 'zod'

export const REPORT_COMMENT_MAX = 500

export const ReportReason = z.enum([
  'inappropriate',
  'spam',
  'broken',
  'impersonation',
  'other',
])
export type ReportReason = z.infer<typeof ReportReason>

export const ReportSubmission = z.object({
  reason: ReportReason,
  comment: z.string().trim().max(REPORT_COMMENT_MAX).optional(),
})
export type ReportSubmission = z.input<typeof ReportSubmission>
