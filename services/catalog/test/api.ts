import { exports } from 'cloudflare:workers'
import { PASSING_TURNSTILE_TOKEN } from './fakeInternet'

const BASE = 'https://catalog.test/v1'

export function get(path: string) {
  return exports.default.fetch(`${BASE}${path}`)
}

export function submit(body: unknown, token = PASSING_TURNSTILE_TOKEN) {
  return exports.default.fetch(`${BASE}/websites`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-turnstile-response': token,
      'cf-connecting-ip': '203.0.113.7',
    },
    body: JSON.stringify(body),
  })
}

export function report(
  id: string,
  body: unknown,
  { ip = '198.51.100.1', token = PASSING_TURNSTILE_TOKEN } = {}
) {
  return exports.default.fetch(`${BASE}/websites/${id}/reports`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-turnstile-response': token,
      'cf-connecting-ip': ip,
    },
    body: JSON.stringify(body),
  })
}

export const SUBMISSION = {
  url: 'https://www.Meu-Projeto.dev/',
  name: 'Meu projeto',
  description: 'Feito no Brasil.',
  categories: ['educacao', 'saude'],
}
