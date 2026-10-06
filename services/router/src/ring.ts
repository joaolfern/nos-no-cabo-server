import type { RingSite } from '../../catalog/src/rpc'

export type Direction = 'prev' | 'next' | 'random'

// `random` is a number in [0, 1), injected so tests are deterministic.
export function navigate(
  sites: RingSite[],
  currentId: string,
  direction: Direction,
  random: number
): RingSite | null {
  const others = sites.filter((site) => site.id !== currentId)
  if (others.length === 0) return null

  if (direction === 'random') {
    return others[Math.floor(random * others.length)] ?? null
  }

  const index = sites.findIndex((site) => site.id === currentId)
  const count = sites.length
  if (index === -1) {
    return (direction === 'next' ? sites[0] : sites[count - 1]) ?? null
  }

  const step = direction === 'next' ? 1 : count - 1
  return sites[(index + step) % count] ?? null
}

export function findByCode(sites: RingSite[], code: string) {
  return sites.find((site) => site.shortCode === code) ?? null
}
