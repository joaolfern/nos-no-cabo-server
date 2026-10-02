import type { Website } from '@nosnocabo/contract'
import { env } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import {
  claimVerificationCheck,
  dueForRecheck,
  recordVerification,
} from '../src/db/verification'
import { SUBMISSION, submit } from './api'

const NOW = Date.UTC(2026, 9, 2, 12)
const HOUR = 60 * 60 * 1000

async function published(
  url: string,
  fields: Record<string, number | null> = {}
) {
  const { id } = (await (
    await submit({ ...SUBMISSION, url })
  ).json()) as Website
  await env.DB.prepare(
    `UPDATE websites SET status = 'published', published_at = 1,
       verified_at = ?, last_verification_check_at = ? WHERE id = ?`
  )
    .bind(fields.verified_at ?? null, fields.last_check ?? null, id)
    .run()
  return id
}

async function state(id: string) {
  return env.DB.prepare(
    'SELECT verified_at, verification_misses, last_verification_check_at FROM websites WHERE id = ?'
  )
    .bind(id)
    .first()
}

describe('verification storage', () => {
  it('allows one check per site per minute, even in parallel', async () => {
    const id = await published('cooldown.dev')

    const claims = await Promise.all(
      [0, 1, 2].map(() => claimVerificationCheck(env.DB, id, NOW))
    )
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(await claimVerificationCheck(env.DB, id, NOW + 59_000)).toBe(false)
    expect(await claimVerificationCheck(env.DB, id, NOW + 61_000)).toBe(true)
  })

  it('grants the badge on a manual find and keeps it on a manual miss', async () => {
    const id = await published('manual.dev')

    await recordVerification(env.DB, id, true, 'manual', NOW)
    expect(await state(id)).toMatchObject({
      verified_at: NOW,
      verification_misses: 0,
    })

    await recordVerification(env.DB, id, false, 'manual', NOW + HOUR)
    expect(await state(id)).toMatchObject({ verified_at: NOW })

    await recordVerification(env.DB, id, true, 'manual', NOW + 2 * HOUR)
    expect(await state(id)).toMatchObject({ verified_at: NOW })
  })

  it('removes the badge only after two re-check misses in a row', async () => {
    const id = await published('recheck.dev', { verified_at: 1 })

    await recordVerification(env.DB, id, false, 'recheck', NOW)
    expect(await state(id)).toMatchObject({
      verified_at: 1,
      verification_misses: 1,
      last_verification_check_at: NOW,
    })

    await recordVerification(env.DB, id, true, 'recheck', NOW + HOUR)
    expect(await state(id)).toMatchObject({
      verified_at: 1,
      verification_misses: 0,
    })

    await recordVerification(env.DB, id, false, 'recheck', NOW + 2 * HOUR)
    await recordVerification(env.DB, id, false, 'recheck', NOW + 3 * HOUR)
    expect(await state(id)).toMatchObject({
      verified_at: null,
      verification_misses: 0,
    })
  })

  it('lists verified sites due for a re-check, oldest check first', async () => {
    const recent = await published('recente.dev', {
      verified_at: 1,
      last_check: NOW - HOUR,
    })
    const old = await published('antigo.dev', {
      verified_at: 1,
      last_check: NOW - 30 * HOUR,
    })
    const never = await published('nunca.dev', {
      verified_at: 1,
      last_check: null,
    })
    await published('sem-selo.dev', { verified_at: null, last_check: null })

    expect(await dueForRecheck(env.DB, 10, NOW)).toEqual([
      { id: never, url: 'https://nunca.dev/' },
      { id: old, url: 'https://antigo.dev/' },
    ])
    expect(await dueForRecheck(env.DB, 1, NOW)).toHaveLength(1)
    expect(recent).toBeTruthy()
  })

  it('is reachable over RPC for the verification Worker', async () => {
    const id = await published('rpc-verifica.dev')

    expect(await exports.CatalogRpc.getVerificationTarget(id)).toEqual({
      id,
      url: 'https://rpc-verifica.dev/',
      status: 'published',
      verifiedAt: null,
    })
    expect(await exports.CatalogRpc.getVerificationTarget('nada')).toBeNull()
    expect(await exports.CatalogRpc.claimVerificationCheck(id)).toBe(true)
    await exports.CatalogRpc.recordVerification(id, true, 'manual')
    expect(
      (await exports.CatalogRpc.getVerificationTarget(id))?.verifiedAt
    ).not.toBeNull()
    expect(await exports.CatalogRpc.dueForRecheck(5)).toEqual([])
  })
})
