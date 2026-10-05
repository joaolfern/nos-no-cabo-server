import { describe, expect, it } from 'vitest'
import manifest from '../package.json'
import categoriesSource from '../src/categories.ts?raw'
import urlSource from '../src/url.ts?raw'
import {
  ReportSubmission,
  VoteSubmission,
  WebsiteListQuery,
  WebsitePage,
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
      'exemplo.com/projeto'
    )
    expect(normalizeUrl('fit.com/a')).not.toBe(normalizeUrl('fit.com/b'))
    expect(normalizeUrl('localhost')).toBeNull()
  })
})

describe('ReportSubmission', () => {
  it('accepts a reason with an optional trimmed comment', () => {
    expect(ReportSubmission.parse({ reason: 'spam' })).toEqual({
      reason: 'spam',
    })
    expect(
      ReportSubmission.parse({ reason: 'other', comment: '  link quebrado ' })
    ).toEqual({ reason: 'other', comment: 'link quebrado' })
  })

  it('rejects unknown reasons and long comments', () => {
    expect(ReportSubmission.safeParse({ reason: 'chato' }).success).toBe(false)
    expect(
      ReportSubmission.safeParse({ reason: 'other', comment: 'a'.repeat(501) })
        .success
    ).toBe(false)
  })
})

describe('VoteSubmission', () => {
  const voterId = '6f1c2b8e-4d3a-4f5e-9a7b-1c2d3e4f5a6b'

  it.each([1, -1, 0])('accepts the vote %s', (value) => {
    expect(VoteSubmission.parse({ voterId, value })).toEqual({ voterId, value })
  })

  it('rejects other values and a voter id that is not a uuid', () => {
    expect(VoteSubmission.safeParse({ voterId, value: 2 }).success).toBe(false)
    expect(VoteSubmission.safeParse({ voterId: 'eu', value: 1 }).success).toBe(
      false
    )
  })
})

describe('WebsitePage', () => {
  const website = {
    id: '01SITE',
    url: 'https://projeto.dev/',
    shortCode: 'abc123',
    name: 'Projeto',
    description: '',
    color: null,
    faviconUrl: null,
    categories: ['educacao'],
    status: 'published',
    verifiedAt: null,
    submittedAt: '2026-10-05T00:00:00.000Z',
    publishedAt: '2026-10-05T00:00:00.000Z',
    likes: 0,
  }
  const neighbours = { previous: null, next: null, random: null }

  it('accepts a page with or without stats', () => {
    const stats = {
      clicks: 1,
      clicks30d: 1,
      referrals: 0,
      likes: 0,
      dislikes: 0,
    }
    expect(WebsitePage.safeParse({ website, neighbours, stats }).success).toBe(
      true
    )
    expect(
      WebsitePage.safeParse({ website, neighbours, stats: null }).success
    ).toBe(true)
  })
})

describe('zod-free entry points', () => {
  // Web clients import these without pulling the schemas (and zod) into their bundle.
  it.each([
    ['categories', categoriesSource],
    ['url', urlSource],
  ])('%s imports nothing that loads zod', (_entry, source) => {
    expect([...source.matchAll(/from '([^']+)'/g)]).toEqual([])
  })

  it.each(['categories', 'url'])(
    '%s is published as its own export',
    (entry) => {
      const exports: Record<string, { import?: { default?: string } }> =
        manifest.exports
      expect(exports[`./${entry}`]?.import?.default).toBe(`./dist/${entry}.js`)
    }
  )
})
