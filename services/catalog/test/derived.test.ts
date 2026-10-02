import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { SUBMISSION, submit } from './api'
import { derivedDrift, rebuildDerived, ringVersion } from './derived'

const SAFE = {
  verdict: 'safe' as const,
  categoriesFlagged: [],
  model: 'test-model',
}

async function create(url: string, categories = ['educacao', 'saude']) {
  const response = await submit({ ...SUBMISSION, url, categories })
  return ((await response.json()) as Website).id
}

async function publish(id: string) {
  await exports.CatalogRpc.applyModeration(id, { ...SAFE, decision: 'publish' })
}

async function counts() {
  const { results } = await env.DB.prepare(
    "SELECT slug, published_count FROM categories WHERE slug IN ('educacao', 'saude') ORDER BY position"
  ).all<{ slug: string; published_count: number }>()
  return Object.fromEntries(results.map((r) => [r.slug, r.published_count]))
}

describe('derived data triggers', () => {
  it('stores categories in display order and indexes new sites for search', async () => {
    const id = await create('ordem.dev', ['saude', 'educacao'])

    const row = await env.DB.prepare(
      'SELECT category_slugs FROM websites WHERE id = ?'
    )
      .bind(id)
      .first<{ category_slugs: string }>()
    expect(JSON.parse(row?.category_slugs ?? '')).toEqual(['educacao', 'saude'])
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('counts a site only while it is published', async () => {
    const id = await create('conta.dev')
    expect(await counts()).toEqual({ educacao: 0, saude: 0 })

    await publish(id)
    expect(await counts()).toEqual({ educacao: 1, saude: 1 })

    await env.DB.prepare(
      "UPDATE websites SET status = 'checking', review_flag = 'reported' WHERE id = ?"
    )
      .bind(id)
      .run()
    expect(await counts()).toEqual({ educacao: 0, saude: 0 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('does not count rejected or held sites', async () => {
    const rejected = await create('rejeitado.dev')
    const held = await create('retido.dev')
    await exports.CatalogRpc.applyModeration(rejected, {
      ...SAFE,
      decision: 'reject',
      reason: 'unsafe',
      verdict: 'unsafe',
    })
    await exports.CatalogRpc.applyModeration(held, {
      ...SAFE,
      decision: 'hold',
      flag: 'unreachable',
      verdict: 'error',
    })

    expect(await counts()).toEqual({ educacao: 0, saude: 0 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('stays consistent when the review script publishes with raw SQL', async () => {
    const id = await create('manual.dev')
    await env.DB.prepare(
      "UPDATE websites SET status = 'published', published_at = 1, short_code = 'abc123', review_flag = NULL WHERE id = ?"
    )
      .bind(id)
      .run()

    expect(await counts()).toEqual({ educacao: 1, saude: 1 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('stays consistent when resubmitting a rejected url', async () => {
    const first = await create('de-novo.dev', ['educacao'])
    await exports.CatalogRpc.applyModeration(first, {
      ...SAFE,
      decision: 'reject',
      reason: 'unsafe',
      verdict: 'unsafe',
    })

    const second = await create('de-novo.dev', ['saude'])
    await publish(second)

    expect(await counts()).toEqual({ educacao: 0, saude: 1 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('decrements once when deleting a published site', async () => {
    const id = await create('apagado.dev')
    await publish(id)

    await env.DB.prepare('DELETE FROM websites WHERE id = ?').bind(id).run()

    expect(await counts()).toEqual({ educacao: 0, saude: 0 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('handles a seed-style insert: published row first, categories after', async () => {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO websites (id, url, url_normalized, name, status, submitted_at, published_at, submitter_ip_hash)
         VALUES ('01SEED000000000000000000AA', 'https://semente.dev/', 'semente.dev', 'Semente', 'published', 1, 1, 'seed')`
      ),
      env.DB.prepare(
        "INSERT INTO website_categories (website_id, category_slug) VALUES ('01SEED000000000000000000AA', 'saude')"
      ),
    ])

    expect(await counts()).toEqual({ educacao: 0, saude: 1 })
    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('keeps the search index in step with renamed sites', async () => {
    const id = await create('renomeado.dev')
    await env.DB.prepare("UPDATE websites SET name = 'Outro nome' WHERE id = ?")
      .bind(id)
      .run()

    expect(await derivedDrift(env.DB)).toEqual([])
  })

  it('bumps the ring version only when the ring changes', async () => {
    const id = await create('anel.dev')
    const start = await ringVersion(env.DB)

    await publish(id)
    const published = await ringVersion(env.DB)
    expect(published).toBeGreaterThan(start)

    await env.DB.prepare('UPDATE websites SET likes = 5 WHERE id = ?')
      .bind(id)
      .run()
    expect(await ringVersion(env.DB)).toBe(published)

    await env.DB.prepare('UPDATE websites SET verified_at = 9 WHERE id = ?')
      .bind(id)
      .run()
    expect(await ringVersion(env.DB)).toBeGreaterThan(published)
  })
})

describe('rebuild-derived.sql', () => {
  it('repairs every kind of drift', async () => {
    const id = await create('reparo.dev')
    await publish(id)
    const before = await ringVersion(env.DB)

    await env.DB.batch([
      env.DB.prepare('UPDATE categories SET published_count = 42'),
      env.DB.prepare(
        "UPDATE counters SET value = 7 WHERE name = 'published_websites'"
      ),
      env.DB.prepare("UPDATE websites SET category_slugs = '[]'"),
      env.DB.prepare('DELETE FROM websites_fts'),
    ])
    expect((await derivedDrift(env.DB)).length).toBeGreaterThan(0)

    await rebuildDerived(env.DB)

    expect(await derivedDrift(env.DB)).toEqual([])
    expect(await ringVersion(env.DB)).toBeGreaterThan(before)
  })
})
