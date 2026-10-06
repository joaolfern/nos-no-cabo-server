import { ipKey } from '@nosnocabo/ip'

const BOT_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|headless|curl|wget|python|go-http/i

export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10)

export function isBot(userAgent: string) {
  return userAgent.trim() === '' || BOT_AGENT.test(userAgent)
}

export async function sha256(text: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

// Cookieless (ADR 0006): the day in the hash makes yesterday's visitors unlinkable to today's.
export function visitorHash(
  salt: string,
  day: string,
  ip: string,
  userAgent: string
) {
  return sha256(`${salt}:${day}:${ipKey(ip)}:${userAgent}`)
}

export function voterHash(salt: string, voterId: string) {
  return sha256(`${salt}:voter:${voterId}`)
}
