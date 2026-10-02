import { describe, expect, it } from 'vitest'
import type { RingSite } from '../../catalog/src/rpc'
import { findByCode, navigate } from '../src/ring'

const site = (id: string, shortCode: string | null = null): RingSite => ({
  id,
  url: `https://${id}.dev/`,
  shortCode,
})
const RING = [site('a', 'aaa111'), site('b'), site('c')]

describe('navigate', () => {
  it('steps through the ring in order and wraps around', () => {
    expect(navigate(RING, 'a', 'next', 0)).toBe('https://b.dev/')
    expect(navigate(RING, 'c', 'next', 0)).toBe('https://a.dev/')
    expect(navigate(RING, 'a', 'prev', 0)).toBe('https://c.dev/')
    expect(navigate(RING, 'b', 'prev', 0)).toBe('https://a.dev/')
  })

  it('picks a random site other than the current one, uniformly', () => {
    expect(navigate(RING, 'a', 'random', 0)).toBe('https://b.dev/')
    expect(navigate(RING, 'a', 'random', 0.99)).toBe('https://c.dev/')
    expect(navigate(RING, 'b', 'random', 0.5)).toBe('https://c.dev/')
  })

  it('sends a site that left the ring to the start, end, or anywhere', () => {
    expect(navigate(RING, 'gone', 'next', 0)).toBe('https://a.dev/')
    expect(navigate(RING, 'gone', 'prev', 0)).toBe('https://c.dev/')
    expect(navigate(RING, 'gone', 'random', 0.5)).toBe('https://b.dev/')
  })

  it('has nowhere to go when no other site is in the ring', () => {
    expect(navigate([site('a')], 'a', 'next', 0)).toBeNull()
    expect(navigate([site('a')], 'a', 'random', 0)).toBeNull()
    expect(navigate([], 'a', 'prev', 0)).toBeNull()
  })
})

describe('findByCode', () => {
  it('resolves a short code to its site', () => {
    expect(findByCode(RING, 'aaa111')).toBe('https://a.dev/')
    expect(findByCode(RING, 'zzz999')).toBeNull()
  })
})
