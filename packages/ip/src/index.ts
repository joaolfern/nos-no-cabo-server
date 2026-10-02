const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i
const HEXTET = /^[0-9a-f]{1,4}$/i

function expandIpv6(address: string): string[] | null {
  const halves = address.split('::')
  if (halves.length > 2) return null

  const [head = '', tail = ''] = halves
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const missing = 8 - left.length - right.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null

  const hextets = [
    ...left,
    ...Array<string>(Math.max(missing, 0)).fill('0'),
    ...right,
  ]
  return hextets.every((hextet) => HEXTET.test(hextet)) ? hextets : null
}

// One home connection usually gets a whole IPv6 /64, so per-address limits key on the /64.
export function ipKey(ip: string): string {
  const address = ip.trim()
  if (!address) return 'unknown'

  const mapped = IPV4_MAPPED.exec(address)
  if (mapped?.[1]) return mapped[1]
  if (!address.includes(':')) return address

  const hextets = expandIpv6(address)
  if (!hextets) return address

  const prefix = hextets
    .slice(0, 4)
    .map((hextet) => parseInt(hextet, 16).toString(16))
  return `${prefix.join(':')}::/64`
}
