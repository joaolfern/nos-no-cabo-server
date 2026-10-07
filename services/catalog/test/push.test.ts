import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SUBSCRIPTION_LIFETIME_MS, addPushSubscription } from '../src/db/push'
import { pushDecisions, sweepPushes } from '../src/lib/pushNotifications'
import {
  encryptPayload,
  fromBase64Url,
  p256Jwk,
  toBase64Url,
  vapidAuthorization,
} from '../src/lib/webPush'
import { SUBMISSION, submit } from './api'

const BASE = 'https://catalog.test/v1'

// RFC 8291, Appendix A.
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  serverPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  serverPublic:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  clientPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  message:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'

const SUBSCRIPTION = {
  endpoint: ENDPOINT,
  expirationTime: null,
  keys: { p256dh: RFC.clientPublic, auth: RFC.auth },
}

async function vapidKeys() {
  const pair = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const publicKey = new Uint8Array(
    (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer
  )
  const { d } = (await crypto.subtle.exportKey(
    'jwk',
    pair.privateKey
  )) as JsonWebKey
  return {
    publicKey: toBase64Url(publicKey),
    privateKey: d as string,
    verifyKey: pair.publicKey,
  }
}

async function checkingSite() {
  return (await (await submit(SUBMISSION)).json()) as Website
}

function subscribe(id: string, body: unknown) {
  return exports.default.fetch(`${BASE}/websites/${id}/subscriptions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function decide(id: string, status: 'published' | 'rejected') {
  await env.DB.prepare('UPDATE websites SET status = ? WHERE id = ?')
    .bind(status, id)
    .run()
}

async function subscriptionCount() {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM push_subscriptions'
  ).first<{ total: number }>()
  return row?.total
}

async function pushEnv() {
  const { publicKey, privateKey } = await vapidKeys()
  return { ...env, VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('encryptPayload', () => {
  it('matches the RFC 8291 test vector', async () => {
    const serverPublic = fromBase64Url(RFC.serverPublic)
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      p256Jwk(serverPublic, fromBase64Url(RFC.serverPrivate)),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits']
    )

    const message = await encryptPayload(
      new TextEncoder().encode(RFC.plaintext),
      { p256dh: RFC.clientPublic, auth: RFC.auth },
      { privateKey, publicKey: serverPublic },
      fromBase64Url(RFC.salt)
    )

    expect(toBase64Url(message)).toBe(RFC.message)
  })
})

describe('vapidAuthorization', () => {
  it('signs a JWT for the push service origin', async () => {
    const keys = await vapidKeys()
    const header = await vapidAuthorization(
      ENDPOINT,
      { ...keys, subject: 'https://nosnocabo.com.br/' },
      1_000_000
    )

    const [, token, publicKey] = header.match(/^vapid t=([^,]+), k=(.+)$/) ?? []
    expect(publicKey).toBe(keys.publicKey)
    const [head, claims, signature] = (token ?? '').split('.')
    expect(
      JSON.parse(new TextDecoder().decode(fromBase64Url(claims ?? '')))
    ).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: 1000 + 12 * 60 * 60,
      sub: 'https://nosnocabo.com.br/',
    })
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.verifyKey,
      fromBase64Url(signature ?? ''),
      new TextEncoder().encode(`${head}.${claims}`)
    )
    expect(isValid).toBe(true)
  })
})

describe('POST /v1/websites/:id/subscriptions', () => {
  it('stores a subscription for a checking site', async () => {
    const website = await checkingSite()

    expect((await subscribe(website.id, SUBSCRIPTION)).status).toBe(204)
    expect((await subscribe(website.id, SUBSCRIPTION)).status).toBe(204)
    expect(await subscriptionCount()).toBe(1)
  })

  it('rejects bodies that are not a push service subscription', async () => {
    const website = await checkingSite()
    const invalid = [
      { endpoint: ENDPOINT },
      { ...SUBSCRIPTION, endpoint: 'https://example.com/push' },
      { ...SUBSCRIPTION, endpoint: 'https://fcm.googleapis.com.evil.dev/x' },
    ]

    for (const body of invalid) {
      expect((await subscribe(website.id, body)).status).toBe(422)
    }
  })

  it('refuses sites that are not checking and caps subscriptions per site', async () => {
    const website = await checkingSite()
    for (let index = 0; index < 5; index++) {
      await subscribe(website.id, {
        ...SUBSCRIPTION,
        endpoint: `${ENDPOINT}${index}`,
      })
    }

    expect(
      (
        await subscribe(website.id, {
          ...SUBSCRIPTION,
          endpoint: `${ENDPOINT}x`,
        })
      ).status
    ).toBe(404)
    expect((await subscribe('nope', SUBSCRIPTION)).status).toBe(404)
    await decide(website.id, 'published')
    expect((await subscribe(website.id, SUBSCRIPTION)).status).toBe(404)
  })
})

describe('pushDecisions', () => {
  it('pushes each decided site once and leaves checking ones alone', async () => {
    const decided = await checkingSite()
    const waiting = (await (
      await submit({ ...SUBMISSION, url: 'outro.dev' })
    ).json()) as Website
    await subscribe(decided.id, SUBSCRIPTION)
    await subscribe(waiting.id, SUBSCRIPTION)
    await decide(decided.id, 'published')
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }))
    const pushEnvironment = await pushEnv()

    await pushDecisions(pushEnvironment)
    await pushDecisions(pushEnvironment)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe(ENDPOINT)
    expect(init?.headers).toMatchObject({
      'content-encoding': 'aes128gcm',
      authorization: expect.stringMatching(/^vapid t=/),
    })
    expect(await subscriptionCount()).toBe(1)
  })

  it('does nothing without VAPID keys', async () => {
    const website = await checkingSite()
    await subscribe(website.id, SUBSCRIPTION)
    await decide(website.id, 'rejected')
    const fetch = vi.spyOn(globalThis, 'fetch')

    await pushDecisions(env)

    expect(fetch).not.toHaveBeenCalled()
    expect(await subscriptionCount()).toBe(1)
  })

  it('logs a failed push without throwing', async () => {
    const website = await checkingSite()
    await subscribe(website.id, SUBSCRIPTION)
    await decide(website.id, 'rejected')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('quota', { status: 429 })
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await pushDecisions(await pushEnv())

    expect(error).toHaveBeenCalledWith('Push failed with 429: quota')
    expect(await subscriptionCount()).toBe(0)
  })
})

describe('sweepPushes', () => {
  it('drops subscriptions older than a week', async () => {
    const website = await checkingSite()
    const target = {
      endpoint: ENDPOINT,
      p256dh: RFC.clientPublic,
      auth: RFC.auth,
    }
    await addPushSubscription(
      env.DB,
      website.id,
      target,
      Date.now() - SUBSCRIPTION_LIFETIME_MS - 1
    )
    await addPushSubscription(env.DB, website.id, {
      ...target,
      endpoint: `${ENDPOINT}2`,
    })

    await sweepPushes(env)

    expect(await subscriptionCount()).toBe(1)
  })
})
