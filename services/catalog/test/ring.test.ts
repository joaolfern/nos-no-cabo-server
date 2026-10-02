import type { Website, WebsiteNeighbours } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { RING_SQL } from '../src/db/ring'
import { SUBMISSION, get, submit } from './api'

async function published(
  name: string,
  fields: { published_at: number; verified_at?: number }
) {
  const response = await submit({ ...SUBMISSION, name, url: `${name}.dev` })
  const { id } = (await response.json()) as Website
  await env.DB.prepare(
    "UPDATE websites SET status = 'published', published_at = ?, verified_at = ? WHERE id = ?"
  )
    .bind(fields.published_at, fields.verified_at ?? null, id)
    .run()
  return id
}

const neighbours = async (id: string) =>
  (await (await get(`/websites/${id}/neighbours`)).json()) as WebsiteNeighbours

async function plan(sql: string) {
  const { results } = await env.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .bind(...Array.from(sql.matchAll(/\?/g), () => 0))
    .all<{ detail: string }>()
  return results.map(({ detail }) => detail)
}

describe('ring', () => {
  it('pairs two sites with each other, never with themselves', async () => {
    const a = await published('alfa', { published_at: 1 })
    const b = await published('beta', { published_at: 2 })

    for (let i = 0; i < 5; i++) {
      const ring = await neighbours(a)
      expect([ring.previous?.id, ring.next?.id, ring.random?.id]).toEqual([
        b,
        b,
        b,
      ])
    }
  })

  it('serves the ring order and its version to the router', async () => {
    const a = await published('alfa', { published_at: 1 })
    const b = await published('beta', { published_at: 2, verified_at: 3 })

    const ring = await exports.CatalogRpc.getRing()
    expect(ring.ids).toEqual([b, a])
    expect(await exports.CatalogRpc.getRingVersion()).toBe(ring.version)
  })

  it('seeks neighbours by ring position instead of walking the ring', async () => {
    for (const sql of [RING_SQL.next, RING_SQL.previous]) {
      expect((await plan(sql)).join('\n')).toMatch(
        /SEARCH w USING (COVERING )?INDEX websites_by_ring \(status=\? AND \(/
      )
    }
  })

  it('picks a random site by seeking published rowids, without sorting', async () => {
    const details = (await plan(RING_SQL.random)).join('\n')

    expect(details).toMatch(/\(status=\? AND rowid>\?\)/)
    expect(details).not.toMatch(/TEMP B-TREE/)
  })
})
