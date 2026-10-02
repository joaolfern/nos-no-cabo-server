import { describe, expect, it } from 'vitest'
import {
  WebsiteListQuery,
  WebsiteSubmission,
  normalizeUrl,
  toAbsoluteUrl,
} from '../src'

const valid = {
  url: 'exemplo.com',
  name: 'Meu projeto',
  categories: ['educacao'],
}

describe('WebsiteSubmission', () => {
  it('accepts a minimal submission and fills the defaults', () => {
    expect(WebsiteSubmission.parse(valid)).toEqual({
      ...valid,
      description: '',
    })
  })

  it('rejects names out of range, unknown or repeated categories and bad colours', () => {
    const invalid = [
      { ...valid, name: 'ab' },
      { ...valid, name: 'a'.repeat(81) },
      { ...valid, categories: [] },
      { ...valid, categories: ['educacao', 'saude', 'cidades', 'outros'] },
      { ...valid, categories: ['nao-existe'] },
      { ...valid, categories: ['educacao', 'educacao'] },
      { ...valid, color: 'red' },
      { ...valid, url: 'não é url' },
    ]

    for (const input of invalid) {
      expect(WebsiteSubmission.safeParse(input).success).toBe(false)
    }
  })
})

describe('WebsiteListQuery', () => {
  it('defaults to Melhores and 24 items, and coerces the limit', () => {
    expect(WebsiteListQuery.parse({})).toEqual({ sort: 'melhores', limit: 24 })
    expect(WebsiteListQuery.parse({ limit: '10' }).limit).toBe(10)
    expect(WebsiteListQuery.safeParse({ limit: '500' }).success).toBe(false)
  })
})

describe('url helpers', () => {
  it('match the client: scheme added, variations share one key', () => {
    expect(toAbsoluteUrl('exemplo.com')).toBe('https://exemplo.com/')
    expect(normalizeUrl('HTTPS://WWW.EXEMPLO.COM//')).toBe('exemplo.com')
    expect(normalizeUrl('https://exemplo.com/projeto/?id=2#topo')).toBe(
      'exemplo.com/projeto?id=2'
    )
    expect(normalizeUrl('localhost')).toBeNull()
  })
})
