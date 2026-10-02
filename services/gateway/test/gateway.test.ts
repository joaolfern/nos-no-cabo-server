import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(`https://api.test${path}`, init)

describe('gateway', () => {
  it('forwards /v1 requests to the catalog', async () => {
    const response = await call('/v1/websites?sort=az')
    expect(await response.json()).toEqual({ path: '/v1/websites' })
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

  it('rate limits submissions per IP', async () => {
    const post = () =>
      call('/v1/websites', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.9' },
        body: '{}',
      })

    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await post()).status)

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(statuses[5]).toBe(429)
  })

  it('rate limits previews per IP', async () => {
    const preview = () =>
      call('/v1/websites/preview?url=exemplo.com', {
        headers: { 'cf-connecting-ip': '198.51.100.10' },
      })

    const statuses = []
    for (let i = 0; i < 21; i++) statuses.push((await preview()).status)

    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true)
    expect(statuses[20]).toBe(429)
  })

  it('does not expose anything outside /v1 yet', async () => {
    expect((await call('/admin')).status).toBe(404)
  })
})
