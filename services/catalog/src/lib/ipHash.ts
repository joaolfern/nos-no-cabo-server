// Raw IPs are never stored; a salted hash is enough to review abuse.
export async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
