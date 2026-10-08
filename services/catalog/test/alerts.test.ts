import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { describe, expect, it, vi } from 'vitest'
import { app } from '../src/app'
import { moderationAlertEmail, reportAlertEmail } from '../src/lib/alerts'
import { CatalogRpc, type ModerationResult } from '../src/rpc'
import { PASSING_TURNSTILE_TOKEN } from './fakeInternet'
import { SUBMISSION, submit } from './api'

const decodeSubject = (raw: string) => {
  const encoded = /^Subject: =\?UTF-8\?B\?(.+)\?=$/m.exec(raw)?.[1] ?? ''
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  )
}

describe('reportAlertEmail', () => {
  const raw = reportAlertEmail(
    {
      website: {
        id: '01SITE',
        name: 'Projeto\r\nBcc: x@evil.dev',
        url: 'https://projeto.dev/',
      },
      reason: 'spam',
      comment: 'Só propaganda',
    },
    {
      from: 'alertas@nosnocabo.com.br',
      to: 'dono@example.com',
      replyTo: 'alertas+01SITE.abc@nosnocabo.com.br',
      homeUrl: 'https://nosnocabo.com.br/',
      now: Date.UTC(2026, 9, 2, 12),
    }
  )

  it('writes a plain-text email with the headers Email Routing requires', () => {
    expect(raw).toMatch(
      /^From: =\?UTF-8\?B\?.+\?= <alertas@nosnocabo\.com\.br>$/m
    )
    expect(raw).toMatch(/^To: dono@example\.com$/m)
    expect(raw).toMatch(/^Message-ID: <.+@nosnocabo\.com\.br>$/m)
    expect(raw).toMatch(/^Content-Type: text\/plain; charset=utf-8$/m)
  })

  it('keeps the site name out of the headers, so it cannot inject one', () => {
    expect(raw).not.toMatch(/^Bcc:/m)
    expect(decodeSubject(raw)).toBe('Denúncia: Projeto Bcc: x@evil.dev')
  })

  it('says what was reported and where to review it', () => {
    expect(raw).toContain('https://projeto.dev/')
    expect(raw).toContain('Motivo: Spam ou golpe')
    expect(raw).toContain('Só propaganda')
    expect(raw).toContain('https://nosnocabo.com.br/website/01SITE')
    expect(raw).toContain('pnpm review list')
  })

  it('asks for a reply to the signed review address', () => {
    expect(raw).toMatch(/^Reply-To: alertas\+01SITE\.abc@nosnocabo\.com\.br$/m)
    expect(raw).toContain('dismiss')
    expect(raw).toContain('ban unreachable')
  })
})

describe('report alert on the reports route', () => {
  async function publishedSite() {
    const website = (await (await submit(SUBMISSION)).json()) as Website
    await env.DB.prepare(
      "UPDATE websites SET status = 'published', published_at = 1 WHERE id = ?"
    )
      .bind(website.id)
      .run()
    return website.id
  }

  function reportWith(
    id: string,
    alertEnv: Record<string, unknown>,
    ip: string
  ) {
    const pending: Promise<unknown>[] = []
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext
    const response = app.request(
      `/v1/websites/${id}/reports`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-turnstile-response': PASSING_TURNSTILE_TOKEN,
          'cf-connecting-ip': ip,
        },
        body: JSON.stringify({ reason: 'spam' }),
      },
      { ...env, ...alertEnv },
      ctx
    )
    return { response, pending }
  }

  it('emails the owner on the first report only', async () => {
    const id = await publishedSite()
    const send = vi.fn(async () => {})
    const alertEnv = {
      ALERT_EMAIL: { send },
      ALERT_FROM: 'alertas@nosnocabo.com.br',
      ALERT_TO: 'dono@example.com',
    }

    const first = reportWith(id, alertEnv, '198.51.100.1')
    expect((await first.response).status).toBe(202)
    await Promise.all(first.pending)
    expect(send).toHaveBeenCalledTimes(1)

    const second = reportWith(id, alertEnv, '198.51.100.2')
    await second.response
    await Promise.all(second.pending)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('still accepts reports when no email is configured or sending fails', async () => {
    const id = await publishedSite()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const unconfigured = reportWith(id, {}, '198.51.100.3')
    expect((await unconfigured.response).status).toBe(202)

    const otherId = await (async () => {
      const website = (await (
        await submit({ ...SUBMISSION, url: 'outro.dev' })
      ).json()) as Website
      await env.DB.prepare(
        "UPDATE websites SET status = 'published' WHERE id = ?"
      )
        .bind(website.id)
        .run()
      return website.id
    })()
    const failing = reportWith(
      otherId,
      {
        ALERT_EMAIL: {
          send: vi.fn(async () => {
            throw new Error('smtp')
          }),
        },
        ALERT_FROM: 'alertas@nosnocabo.com.br',
        ALERT_TO: 'dono@example.com',
      },
      '198.51.100.4'
    )
    expect((await failing.response).status).toBe(202)
    await Promise.all(failing.pending)
  })
})

const ADDRESSING = {
  from: 'alertas@nosnocabo.com.br',
  to: 'dono@example.com',
  replyTo: 'alertas+01SITE.abc@nosnocabo.com.br',
  homeUrl: 'https://nosnocabo.com.br/',
  now: Date.UTC(2026, 9, 2, 12),
}

describe('moderationAlertEmail', () => {
  const website = {
    id: '01SITE',
    name: 'Projeto\r\nBcc: x@evil.dev',
    url: 'https://projeto.dev/',
    description: 'Um projeto legal',
  }

  it('names the outcome in the subject', () => {
    const subject = (
      outcome: Parameters<typeof moderationAlertEmail>[0]['outcome']
    ) => decodeSubject(moderationAlertEmail({ website, outcome }, ADDRESSING))

    expect(subject({ decision: 'publish' })).toBe(
      'Novo site: Projeto Bcc: x@evil.dev, publicado'
    )
    expect(subject({ decision: 'reject', reason: 'unsafe' })).toBe(
      'Novo site: Projeto Bcc: x@evil.dev, recusado'
    )
    expect(subject({ decision: 'hold', flag: 'unreachable' })).toBe(
      'Novo site: Projeto Bcc: x@evil.dev, aguardando sua revisão'
    )
  })

  it('says what the check decided and how to answer it', () => {
    const raw = moderationAlertEmail(
      {
        website,
        outcome: { decision: 'reject', reason: 'unsafe' },
        verdict: 'unsafe',
        categoriesFlagged: ['S1', 'S4'],
      },
      ADDRESSING
    )

    expect(raw).not.toMatch(/^Bcc:/m)
    expect(raw).toMatch(/^Reply-To: alertas\+01SITE\.abc@nosnocabo\.com\.br$/m)
    expect(raw).toContain('recusou o site (motivo: unsafe)')
    expect(raw).toContain('Veredito da IA: unsafe (S1, S4)')
    expect(raw).toContain('Um projeto legal')
    expect(raw).not.toContain('/website/01SITE')
  })

  it('links the page only once the site is published', () => {
    const raw = moderationAlertEmail(
      { website, outcome: { decision: 'publish' } },
      ADDRESSING
    )
    expect(raw).toContain('https://nosnocabo.com.br/website/01SITE')
  })
})

describe('new site alert', () => {
  const SAFE: ModerationResult = {
    decision: 'publish',
    verdict: 'safe',
    categoriesFlagged: [],
    model: 'test-model',
  }

  function alerting() {
    const send = vi.fn(async (_message: unknown) => ({ messageId: 'sent' }))
    const pending: Promise<unknown>[] = []
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext
    const alertEnv = {
      ...env,
      ALERT_EMAIL: { send },
      ALERT_FROM: 'alertas@nosnocabo.com.br',
      ALERT_TO: 'dono@example.com',
    } as typeof env
    return { send, pending, ctx, alertEnv }
  }

  it('emails once when moderation decides a site, not on a retry', async () => {
    const { send, pending, ctx, alertEnv } = alerting()
    const rpc = new CatalogRpc(ctx, alertEnv)
    const website = (await (await submit(SUBMISSION)).json()) as Website

    expect(await rpc.applyModeration(website.id, SAFE)).toBe(true)
    expect(await rpc.applyModeration(website.id, SAFE)).toBe(false)
    await Promise.all(pending)

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('emails once for a held site, even if the hold is applied again', async () => {
    const { send, pending, ctx, alertEnv } = alerting()
    const rpc = new CatalogRpc(ctx, alertEnv)
    const website = (await (await submit(SUBMISSION)).json()) as Website
    const hold: ModerationResult = {
      ...SAFE,
      decision: 'hold',
      flag: 'unreachable',
      verdict: 'error',
    }

    expect(await rpc.applyModeration(website.id, hold)).toBe(true)
    expect(await rpc.applyModeration(website.id, hold)).toBe(false)
    await Promise.all(pending)

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('emails a held alert when the moderation queue is down', async () => {
    const { send, pending, ctx, alertEnv } = alerting()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await app.request(
      '/v1/websites',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-turnstile-response': PASSING_TURNSTILE_TOKEN,
          'cf-connecting-ip': '198.51.100.9',
        },
        body: JSON.stringify(SUBMISSION),
      },
      {
        ...alertEnv,
        MODERATION_QUEUE: {
          send: vi.fn(async () => {
            throw new Error('down')
          }),
        },
      },
      ctx
    )
    expect(response.status).toBe(202)
    await Promise.all(pending)

    expect(send).toHaveBeenCalledTimes(1)
  })
})
