import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { describe, expect, it, vi } from 'vitest'
import {
  handleReviewReply,
  parseReviewCommand,
  readReviewAddress,
  reviewAddress,
} from '../src/lib/reviewReplies'
import { SUBMISSION, submit } from './api'

const OWNER = 'dono@example.com'
const reviewEnv = {
  ...env,
  ALERT_FROM: 'alertas@nosnocabo.com.br',
  ALERT_TO: OWNER,
  REVIEW_SECRET: 'review-secret',
}

async function reportedSite() {
  const website = (await (await submit(SUBMISSION)).json()) as Website
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE websites SET status = 'published', published_at = 1, short_code = 'abc123',
         review_flag = 'reported' WHERE id = ?`
    ).bind(website.id),
    env.DB.prepare(
      `INSERT INTO reports (website_id, reason, comment, reporter_ip_hash, created_at)
       VALUES (?, 'spam', NULL, 'hash', 1)`
    ).bind(website.id),
  ])
  return website.id
}

function replyEmail(body: string) {
  return [
    `From: Dono <${OWNER}>`,
    'To: alertas@nosnocabo.com.br',
    'Subject: Re: =?UTF-8?B?RGVuw7puY2lh?=',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')
}

function incoming(to: string, body: string, from = OWNER) {
  const raw = new Response(replyEmail(body)).body!
  return {
    from,
    to,
    raw,
    headers: new Headers(),
    rawSize: 0,
    setReject: vi.fn(),
    forward: vi.fn(),
    reply: vi.fn(async () => ({ messageId: 'reply' })),
  }
}

async function handle(message: ReturnType<typeof incoming>) {
  await handleReviewReply(
    message as unknown as ForwardableEmailMessage,
    reviewEnv
  )
  return message
}

const siteRow = (id: string) =>
  env.DB.prepare(
    `SELECT status, review_flag, rejection_reason,
       (SELECT COUNT(*) FROM reports WHERE website_id = id) AS reports
     FROM websites WHERE id = ?`
  )
    .bind(id)
    .first()

describe('review address', () => {
  const id = '01JABCDEFGHJKMNPQRSTVWXYZ0'

  it('round-trips, whatever the case of the local part', async () => {
    const address = (await reviewAddress(reviewEnv, id))!
    expect(address).toMatch(
      /^alertas\+01JABCDEFGHJKMNPQRSTVWXYZ0\.[0-9a-f]{24}@nosnocabo\.com\.br$/
    )
    expect(address.split('@')[0]!.length).toBeLessThanOrEqual(64)
    expect(await readReviewAddress(reviewEnv, address)).toBe(id)
    expect(await readReviewAddress(reviewEnv, address.toLowerCase())).toBe(id)
  })

  it('rejects a forged or missing signature', async () => {
    const address = (await reviewAddress(reviewEnv, id))!
    const otherId = '01JABCDEFGHJKMNPQRSTVWXYZ1'
    expect(
      await readReviewAddress(reviewEnv, address.replace(id, otherId))
    ).toBeNull()
    expect(
      await readReviewAddress(reviewEnv, 'alertas@nosnocabo.com.br')
    ).toBeNull()
    expect(
      await readReviewAddress({ ...reviewEnv, REVIEW_SECRET: 'other' }, address)
    ).toBeNull()
  })

  it('is off without a secret', async () => {
    expect(
      await reviewAddress({ ...reviewEnv, REVIEW_SECRET: undefined }, id)
    ).toBeNull()
  })
})

describe('parseReviewCommand', () => {
  it('reads the first line above the quoted alert', () => {
    expect(parseReviewCommand('Ban\r\n\r\n> dismiss')).toEqual({
      action: 'ban',
      reason: 'unsafe',
    })
    expect(
      parseReviewCommand('\n  dismiss.\n\nOn Tue, João wrote:\n> x')
    ).toEqual({ action: 'dismiss' })
    expect(parseReviewCommand('ban unreachable')).toEqual({
      action: 'ban',
      reason: 'unreachable',
    })
  })

  it('refuses anything else', () => {
    expect(parseReviewCommand('')).toBeNull()
    expect(parseReviewCommand('> ban')).toBeNull()
    expect(parseReviewCommand('Em ter., João escreveu:\n> ban')).toBeNull()
    expect(parseReviewCommand('ban everything')).toBeNull()
    expect(parseReviewCommand('dismiss please')).toBeNull()
    expect(parseReviewCommand('não sei')).toBeNull()
  })
})

describe('handleReviewReply', () => {
  it('bans the site and confirms by reply', async () => {
    const id = await reportedSite()
    const message = await handle(
      incoming((await reviewAddress(reviewEnv, id))!, 'ban\r\n\r\n> Denúncia')
    )

    expect(await siteRow(id)).toMatchObject({
      status: 'rejected',
      review_flag: null,
      rejection_reason: 'unsafe',
    })
    expect(message.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Re: Denúncia',
        text: expect.stringContaining('tirado do ar (unsafe)'),
      })
    )
  })

  it('dismisses the reports and keeps the site published', async () => {
    const id = await reportedSite()
    await handle(incoming((await reviewAddress(reviewEnv, id))!, 'dismiss'))

    expect(await siteRow(id)).toMatchObject({
      status: 'published',
      review_flag: null,
      reports: 0,
    })
  })

  it('answers with the usage when the reply is not a command', async () => {
    const id = await reportedSite()
    const message = await handle(
      incoming((await reviewAddress(reviewEnv, id))!, 'ok, vou ver')
    )

    expect((await siteRow(id))?.review_flag).toBe('reported')
    expect(message.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('ban unreachable'),
      })
    )
  })

  it('rejects mail from anyone but the owner, or to an unsigned address', async () => {
    const id = await reportedSite()
    const address = (await reviewAddress(reviewEnv, id))!

    const stranger = await handle(incoming(address, 'ban', 'x@evil.dev'))
    const unsigned = await handle(incoming('alertas@nosnocabo.com.br', 'ban'))

    for (const message of [stranger, unsigned]) {
      expect(message.setReject).toHaveBeenCalled()
      expect(message.reply).not.toHaveBeenCalled()
    }
    expect((await siteRow(id))?.status).toBe('published')
  })
})
