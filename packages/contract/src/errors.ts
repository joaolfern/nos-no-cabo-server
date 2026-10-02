import { z } from 'zod'

export const API_ERROR_CODES = [
  'duplicate',
  'invalid',
  'unreachable',
  'rate_limited',
  'turnstile_failed',
  'not_found',
  'internal',
] as const

export const ApiErrorCode = z.enum(API_ERROR_CODES)
export type ApiErrorCode = z.infer<typeof ApiErrorCode>

export const ApiErrorResponse = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    existingId: z.string().optional(),
  }),
})
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>
