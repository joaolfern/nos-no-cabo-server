import type {
  ApiErrorResponse,
  Page,
  Website,
  WebsiteStatusEntry,
} from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { SUBMISSION, get, submit } from './api'

async function publish(id: string, fields: Record<string, number> = {}) {
  const sets = Object.keys(fields).map((key) => `${key} = ?`)
  await env.DB.prepare(
    `UPDATE websites SET status = 'published', published_at = ?${sets.map((s) => `, ${s}`).join('')} WHERE id = ?`
  )
    .bind(fields.published_at ?? Date.now(), ...Object.values(fields), id)
    .run()
}

async function create(name: string, url: string, categories = ['outros']) {
  const response = await submit({ ...SUBMISSION, name, url, categories })
  return ((await response.json()) as Website).id
}

describe('POST /v1/websites', () => {
  it('creates a checking website and returns 202 with it', async () => {
    const response = await submit(SUBMISSION)
    const website = (await response.json()) as Website

    expect(response.status).toBe(202)
    expect(website).toMatchObject({
      url: 'https://www.meu-projeto.dev/',
      name: 'Meu projeto',
      categories: ['educacao', 'saude'],
      status: 'checking',
      shortCode: null,
      verifiedAt: null,
      publishedAt: null,
    })
    expect(website.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('stores a salted hash of the IP, never the IP', async () => {
    await submit(SUBMISSION)
    const row = await env.DB.prepare(
      'SELECT submitter_ip_hash FROM websites'
    ).first<{
      submitter_ip_hash: string
    }>()

    expect(row?.submitter_ip_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('answers 409 with the existing id for the same site in another spelling', async () => {
    const first = (await (await submit(SUBMISSION)).json()) as Website
    const again = await submit({ ...SUBMISSION, url: 'meu-projeto.dev' })
    const body = (await again.json()) as ApiErrorResponse

    expect(again.status).toBe(409)
    expect(body.error).toMatchObject({
      code: 'duplicate',
      existingId: first.id,
    })
  })

  it('lets a rejected site be submitted again', async () => {
    const first = (await (await submit(SUBMISSION)).json()) as Website
    await env.DB.prepare(
      "UPDATE websites SET status = 'rejected', rejection_reason = 'unsafe' WHERE id = ?"
    )
      .bind(first.id)
      .run()

    const again = await submit(SUBMISSION)
    expect(again.status).toBe(202)
    expect(((await again.json()) as Website).id).not.toBe(first.id)
  })

  it('rejects invalid submissions and failed Turnstile checks', async () => {
    const invalid = await submit({ ...SUBMISSION, categories: [] })
    expect(invalid.status).toBe(422)
    expect(((await invalid.json()) as ApiErrorResponse).error.code).toBe(
      'invalid'
    )

    const robot = await submit(SUBMISSION, 'bad-token')
    expect(robot.status).toBe(400)
    expect(((await robot.json()) as ApiErrorResponse).error.code).toBe(
      'turnstile_failed'
    )
  })
})

describe('GET /v1/websites/:id and /status', () => {
  it('returns a website by id, and 404 for unknown ids', async () => {
    const id = await create('Projeto A', 'a.dev')

    expect(
      ((await (await get(`/websites/${id}`)).json()) as Website).name
    ).toBe('Projeto A')
    expect((await get('/websites/nao-existe')).status).toBe(404)
  })

  it('returns the statuses of many drafts in one request', async () => {
    const a = await create('Projeto A', 'a.dev')
    const b = await create('Projeto B', 'b.dev')
    await publish(a)

    const statuses = (await (
      await get(`/websites/status?ids=${a},${b},desconhecido`)
    ).json()) as WebsiteStatusEntry[]

    expect(statuses).toEqual(
      expect.arrayContaining([
        { id: a, status: 'published' },
        { id: b, status: 'checking' },
      ])
    )
    expect(statuses).toHaveLength(2)
  })
})

describe('GET /v1/websites', () => {
  async function seed() {
    const ids = {
      alfa: await create('Alfa', 'alfa.dev', ['educacao']),
      beta: await create('beta', 'beta.dev', ['saude']),
      gama: await create('Gama', 'gama.dev', ['educacao']),
      rascunho: await create('Rascunho', 'rascunho.dev', ['educacao']),
    }
    await publish(ids.alfa, { rank_score: 1, likes: 30, published_at: 1000 })
    await publish(ids.beta, { rank_score: 9, likes: 10, published_at: 3000 })
    await publish(ids.gama, { rank_score: 5, likes: 20, published_at: 2000 })
    return ids
  }

  const names = async (query: string) =>
    (
      (await (await get(`/websites${query}`)).json()) as Page<Website>
    ).items.map(({ name }) => name)

  it('lists only published sites, by Melhores by default', async () => {
    await seed()
    expect(await names('')).toEqual(['beta', 'Gama', 'Alfa'])
  })

  it('sorts by recentes, curtidos and az (case-insensitive)', async () => {
    await seed()
    expect(await names('?sort=recentes')).toEqual(['beta', 'Gama', 'Alfa'])
    expect(await names('?sort=curtidos')).toEqual(['Alfa', 'Gama', 'beta'])
    expect(await names('?sort=az')).toEqual(['Alfa', 'beta', 'Gama'])
  })

  it('filters by category and search text', async () => {
    await seed()
    expect(await names('?categoria=educacao')).toEqual(['Gama', 'Alfa'])
    expect(await names('?q=gam')).toEqual(['Gama'])
    expect(await names('?q=%25')).toEqual([])
  })

  it('ignores accents and case when searching', async () => {
    const id = await create('Querido Diário', 'diario.dev', ['cidades'])
    await publish(id)

    expect(await names('?q=diario')).toEqual(['Querido Diário'])
    expect(await names('?q=DIÁRIO')).toEqual(['Querido Diário'])
  })

  it('pages with a cursor and reports the total', async () => {
    await seed()
    const first = (await (
      await get('/websites?limit=2')
    ).json()) as Page<Website>

    expect(first.items.map(({ name }) => name)).toEqual(['beta', 'Gama'])
    expect(first.total).toBe(3)
    expect(first.nextCursor).not.toBeNull()

    const second = (await (
      await get(`/websites?limit=2&cursor=${first.nextCursor}`)
    ).json()) as Page<Website>
    expect(second.items.map(({ name }) => name)).toEqual(['Alfa'])
    expect(second.nextCursor).toBeNull()
  })

  it('rejects bad queries and cursors', async () => {
    expect((await get('/websites?sort=aleatorio')).status).toBe(422)
    expect((await get('/websites?cursor=lixo')).status).toBe(422)
  })
})

describe('GET /v1/websites/:id/neighbours', () => {
  const neighbours = async (id: string) =>
    (await (await get(`/websites/${id}/neighbours`)).json()) as {
      previous: Website | null
      next: Website | null
      random: Website | null
    }

  it('follows the ring order, verified first, and wraps around', async () => {
    const a = await create('Alfa', 'a.dev')
    const b = await create('Beta', 'b.dev')
    const c = await create('Gama', 'c.dev')
    await publish(a, { published_at: 1000 })
    await publish(b, { published_at: 2000, verified_at: 5000 })
    await publish(c, { published_at: 3000 })

    const first = await neighbours(b)
    expect([first.previous?.name, first.next?.name]).toEqual(['Gama', 'Alfa'])

    const last = await neighbours(c)
    expect([last.previous?.name, last.next?.name]).toEqual(['Alfa', 'Beta'])
    expect(['Alfa', 'Beta']).toContain(last.random?.name)
  })

  it('has no neighbours alone, and 404 for unpublished or unknown sites', async () => {
    const solo = await create('Solo', 'solo.dev')
    const draft = await create('Rascunho', 'rascunho.dev')
    await publish(solo)

    expect(await neighbours(solo)).toEqual({
      previous: null,
      next: null,
      random: null,
    })
    expect((await get(`/websites/${draft}/neighbours`)).status).toBe(404)
    expect((await get('/websites/nada/neighbours')).status).toBe(404)
  })
})

describe('cache headers', () => {
  it('lets shared caches keep public lists briefly, never drafts or statuses', async () => {
    const id = await create('Alfa', 'alfa.dev')

    for (const path of ['/websites', '/categories']) {
      expect((await get(path)).headers.get('cache-control')).toBe(
        'public, max-age=0, s-maxage=30'
      )
    }
    for (const path of [`/websites/${id}`, `/websites/status?ids=${id}`]) {
      expect((await get(path)).headers.get('cache-control')).toBe('no-store')
    }
  })
})

describe('GET /v1/categories', () => {
  it('counts published sites per category, in display order', async () => {
    const id = await create('Alfa', 'alfa.dev', ['educacao', 'saude'])
    await create('Rascunho', 'rascunho.dev', ['educacao'])
    await publish(id)

    const { total, items } = (await (await get('/categories')).json()) as {
      total: number
      items: { slug: string; count: number }[]
    }

    expect(total).toBe(1)
    expect(items[0]).toEqual({ slug: 'ia-e-iot', count: 0 })
    expect(items.find(({ slug }) => slug === 'educacao')?.count).toBe(1)
    expect(items).toHaveLength(11)
  })
})
