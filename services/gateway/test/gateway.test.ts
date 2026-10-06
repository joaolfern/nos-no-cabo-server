import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(`https://api.test${path}`, init)

describe('gateway', () => {
  it('forwards /v1 requests to the catalog', async () => {
    const response = await call('/v1/websites?sort=az')
    expect(await response.json()).toEqual({ path: '/v1/websites' })
  })

  it('sends verification requests to the verification Worker', async () => {
    const response = await call('/v1/websites/01SITE/verify', {
      method: 'POST',
    })
    expect(await response.json()).toEqual({
      worker: 'verification',
      path: '/v1/websites/01SITE/verify',
    })

    const other = await call('/v1/websites/01SITE', { method: 'GET' })
    expect(await other.json()).toEqual({ path: '/v1/websites/01SITE' })
  })

  it('sends stats and votes to the metrics Worker', async () => {
    const stats = await call('/v1/websites/01SITE/stats')
    expect(await stats.json()).toEqual({
      worker: 'metrics',
      path: '/v1/websites/01SITE/stats',
    })

    const vote = await call('/v1/websites/01SITE/votes', { method: 'POST' })
    expect(await vote.json()).toEqual({
      worker: 'metrics',
      path: '/v1/websites/01SITE/votes',
    })
  })

  it('combines the website, its neighbours and its stats into one page', async () => {
    const response = await call('/v1/websites/01SITE/page')

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      website: { path: '/v1/websites/01SITE' },
      neighbours: { path: '/v1/websites/01SITE/neighbours' },
      stats: { worker: 'metrics', path: '/v1/websites/01SITE/stats' },
    })
  })

  it('answers 404 for an unknown site page', async () => {
    const response = await call('/v1/websites/NADA/page', {
      headers: { origin: 'http://localhost:5173' },
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'not_found' },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173'
    )
  })

  it('still serves the page without neighbours or stats', async () => {
    const inReview = await (await call('/v1/websites/REVISAO/page')).json()
    expect(inReview).toMatchObject({
      neighbours: { previous: null, next: null, random: null },
    })

    const noStats = await (await call('/v1/websites/SEMSTATS/page')).json()
    expect(noStats).toMatchObject({ stats: null })
  })

  it('allows the web app origins, including Pages previews, and nothing else', async () => {
    const allowed = [
      'http://localhost:5173',
      'https://abc123.nosnocabo.pages.dev',
    ]
    for (const origin of allowed) {
      const response = await call('/v1/categories', { headers: { origin } })
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    }

    const other = await call('/v1/categories', {
      headers: { origin: 'https://evil.example' },
    })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers the CORS preflight for submissions with the Turnstile header', async () => {
    const response = await call('/v1/websites', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, cf-turnstile-response',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'cf-turnstile-response'
    )
  })

  it('lets a whole classroom on one network use the app', async () => {
    const sameNetwork = { 'cf-connecting-ip': '198.51.100.50' }
    const requests = [
      ...Array.from({ length: 30 }, () =>
        call('/v1/websites', {
          method: 'POST',
          headers: sameNetwork,
          body: '{}',
        })
      ),
      ...Array.from({ length: 150 }, () =>
        call('/v1/websites', { headers: sameNetwork })
      ),
    ]

    const statuses = (await Promise.all(requests)).map(({ status }) => status)
    expect(statuses.every((status) => status === 200)).toBe(true)
  })

  it('does not expose anything outside /v1 yet', async () => {
    expect((await call('/admin')).status).toBe(404)
  })
})
