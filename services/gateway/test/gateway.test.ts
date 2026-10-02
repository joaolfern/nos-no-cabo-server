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
