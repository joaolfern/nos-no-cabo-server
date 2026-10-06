import type { Page, Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { SUBMISSION, get, submit } from './api'
import { ringVersion } from './derived'

async function published(name: string, publishedAt: number) {
  const response = await submit({ ...SUBMISSION, name, url: `${name}.dev` })
  const { id } = (await response.json()) as Website
  await env.DB.prepare(
    "UPDATE websites SET status = 'published', published_at = ? WHERE id = ?"
  )
    .bind(publishedAt, id)
    .run()
  return id
}

async function order(sort: string) {
  const page = (await (
    await get(`/websites?sort=${sort}`)
  ).json()) as Page<Website>
  return page.items.map((website) => website.name)
}

describe('metrics RPC', () => {
  it('lists the rank inputs of published sites only', async () => {
    const id = await published('alfa', 1)
    await submit({ ...SUBMISSION, name: 'pendente', url: 'pendente.dev' })
    await env.DB.prepare('UPDATE websites SET verified_at = 5 WHERE id = ?')
      .bind(id)
      .run()

    expect(await exports.CatalogRpc.getRankInputs()).toEqual([
      { id, verified: true, rankScore: 0, likes: 0 },
    ])
  })

  it('reorders "melhores" and "curtidos" without touching the ring', async () => {
    const alfa = await published('alfa', 1)
    const beta = await published('beta', 2)
    expect(await order('melhores')).toEqual(['beta', 'alfa'])
    const version = await ringVersion(env.DB)

    await exports.CatalogRpc.setMetrics([
      { id: alfa, rankScore: 4.2, likes: 3 },
      { id: beta, likes: -1 },
    ])

    expect(await order('melhores')).toEqual(['alfa', 'beta'])
    expect(await order('curtidos')).toEqual(['alfa', 'beta'])
    expect(await ringVersion(env.DB)).toBe(version)

    const website = (await (await get(`/websites/${beta}`)).json()) as Website
    expect(website.likes).toBe(-1)
  })

  it('knows whether a site is published', async () => {
    const id = await published('alfa', 1)
    const response = await submit({
      ...SUBMISSION,
      name: 'novo',
      url: 'novo.dev',
    })
    const pending = ((await response.json()) as Website).id

    expect(await exports.CatalogRpc.isPublished(id)).toBe(true)
    expect(await exports.CatalogRpc.isPublished(pending)).toBe(false)
    expect(await exports.CatalogRpc.isPublished('nada')).toBe(false)
  })
})
