const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export const TURNSTILE_HEADER = 'cf-turnstile-response'

export async function verifyTurnstile(
  secret: string,
  token: string | undefined,
  ip: string | undefined
) {
  if (!token) return false

  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  if (ip) body.append('remoteip', ip)

  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const result = await response.json<{ success: boolean }>()
    return result.success
  } catch {
    return false
  }
}
