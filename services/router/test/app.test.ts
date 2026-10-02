import { describe, expect, it } from 'vitest'
import type { RingSite } from '../../catalog/src/rpc'
import { createApp } from '../src/app'

const HOME = 'https://nosnocabo.pages.dev/'
const RING: RingSite[] = [
  { id: 'a', url: 'https://a.dev/', shortCode: 'aaa111' },
  { id: 'b', url: 'https://b.dev/', shortCode: null },
]

const app = (sites: RingSite[] | null = RING) =>
  createApp({
    getSites: async () => sites,
    homeUrl: () => HOME,
    random: () => 0,
  })

describe('router', () => {
  it('redirects ring links to the neighbour, uncached and unindexed', async () => {
    const response = await app().request('/ring/a/next')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://b.dev/')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(
      (await app().request('/ring/a/random')).headers.get('location')
    ).toBe('https://b.dev/')
  })

  it('resolves short links', async () => {
    const response = await app().request('/r/aaa111')
    expect(response.headers.get('location')).toBe('https://a.dev/')
  })

  it('falls back to the home page when it has nowhere better to send people', async () => {
    for (const path of ['/r/nada', '/ring/a/next']) {
      const fallback = await app(path === '/r/nada' ? RING : null).request(path)
      expect(fallback.status).toBe(302)
      expect(fallback.headers.get('location')).toBe(HOME)
    }
    expect((await app().request('/ring/a/sideways')).status).toBe(404)
  })

  it('asks crawlers to stay out of ring and short links', async () => {
    const response = await app().request('/robots.txt')
    expect(await response.text()).toBe(
      'User-agent: *\nDisallow: /ring/\nDisallow: /r/\n'
    )
  })
})
