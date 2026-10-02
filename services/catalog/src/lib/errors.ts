import type { ApiErrorCode, ApiErrorResponse } from '@nosnocabo/contract'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  existingId?: string
) {
  const body: ApiErrorResponse = { error: { code, message, existingId } }
  return c.json(body, status)
}

export function duplicateError(c: Context, existingId: string) {
  return apiError(
    c,
    409,
    'duplicate',
    'Esse site já está no Nós no Cabo.',
    existingId
  )
}
