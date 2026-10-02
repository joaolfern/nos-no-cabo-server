import { ipKey } from '@nosnocabo/ip'

// Raw IPs are never stored; a salted hash of the client's key (IPv6 /64) is enough to review abuse.
export async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ipKey(ip)}`)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
