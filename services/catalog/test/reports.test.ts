import type { Page, Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { SUBMISSION, get, report, submit } from './api'

async function publishedSite() {
  const website = (await (await submit(SUBMISSION)).json()) as Website
  await env.DB.prepare(
    "UPDATE websites SET status = 'published', published_at = ? WHERE id = ?"
  )
    .bind(Date.now(), website.id)
    .run()
  return website.id
}

async function reportCount(id: string) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM reports WHERE website_id = ?'
  )
    .bind(id)
    .first<{ total: number }>()
  return row?.total
}

describe('POST /v1/websites/:id/reports', () => {
  it('accepts a report with 202 and stores it', async () => {
    const id = await publishedSite()
    const response = await report(id, {
      reason: 'spam',
      comment: ' propaganda ',
    })

    expect(response.status).toBe(202)
    const row = await env.DB.prepare(
      'SELECT reason, comment, reporter_ip_hash FROM reports'
    ).first<{ reason: string; comment: string; reporter_ip_hash: string }>()
    expect(row).toMatchObject({ reason: 'spam', comment: 'propaganda' })
    expect(row?.reporter_ip_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rejects an invalid body, a failed Turnstile and an unpublished site', async () => {
    const id = await publishedSite()
    const checking = (await (
      await submit({ ...SUBMISSION, url: 'outro.dev' })
    ).json()) as Website

    expect((await report(id, { reason: 'chato' })).status).toBe(422)
    expect(
      (await report(id, { reason: 'spam' }, { token: 'bad' })).status
    ).toBe(400)
    expect((await report(checking.id, { reason: 'spam' })).status).toBe(404)
    expect((await report('nope', { reason: 'spam' })).status).toBe(404)
  })

  it('counts one report per IP', async () => {
    const id = await publishedSite()
    await report(id, { reason: 'spam' })
    await report(id, { reason: 'other' })

    expect(await reportCount(id)).toBe(1)
  })

  it('counts one report per IPv6 /64, so rotating addresses adds nothing', async () => {
    const id = await publishedSite()
    for (const host of [1, 2, 3]) {
      await report(id, { reason: 'spam' }, { ip: `2001:db8:5:6::${host}` })
    }

    expect(await reportCount(id)).toBe(1)
    const site = await env.DB.prepare(
      'SELECT status FROM websites WHERE id = ?'
    )
      .bind(id)
      .first<{ status: string }>()
    expect(site?.status).toBe('published')
  })

  it('flags the site for review on the first report, keeping it published', async () => {
    const id = await publishedSite()

    await report(id, { reason: 'inappropriate' })

    const site = await env.DB.prepare(
      'SELECT status, review_flag FROM websites WHERE id = ?'
    )
      .bind(id)
      .first()
    expect(site).toEqual({ status: 'published', review_flag: 'reported' })

    const page = (await (await get('/websites')).json()) as Page<Website>
    expect(page.items.map((website) => website.id)).toContain(id)
  })

  it('never hides a site, however many people report it', async () => {
    const id = await publishedSite()
    for (const ip of [
      '198.51.100.1',
      '198.51.100.2',
      '198.51.100.3',
      '198.51.100.4',
    ]) {
      await report(id, { reason: 'spam' }, { ip })
    }

    const site = await env.DB.prepare(
      'SELECT status FROM websites WHERE id = ?'
    )
      .bind(id)
      .first<{ status: string }>()
    expect(site?.status).toBe('published')
  })
})
