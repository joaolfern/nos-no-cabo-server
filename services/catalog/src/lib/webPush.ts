// Web Push without a library: payload encryption (RFC 8291) and VAPID (RFC 8292) on WebCrypto.

export type PushTarget = { endpoint: string; p256dh: string; auth: string }

export type VapidKeys = {
  publicKey: string
  privateKey: string
  subject: string
}

type ServerKeys = { privateKey: CryptoKey; publicKey: Uint8Array }

const RECORD_SIZE = 4096
const TTL_SECONDS = 24 * 60 * 60
const JWT_LIFETIME_SECONDS = 12 * 60 * 60

const encoder = new TextEncoder()

export function fromBase64Url(text: string) {
  const base64 = text.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

export function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0)
  )
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bytes: number
) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    bytes * 8
  )
  return new Uint8Array(bits)
}

// An uncompressed P-256 point (0x04 || x || y) and its private scalar as a JWK.
export function p256Jwk(publicKey: Uint8Array, privateKey?: Uint8Array) {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: toBase64Url(publicKey.slice(1, 33)),
    y: toBase64Url(publicKey.slice(33, 65)),
    ...(privateKey && { d: toBase64Url(privateKey) }),
  }
}

async function generateServerKeys(): Promise<ServerKeys> {
  const pair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )) as CryptoKeyPair
  const publicKey = new Uint8Array(
    (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer
  )
  return { privateKey: pair.privateKey, publicKey }
}

export async function encryptPayload(
  payload: Uint8Array,
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  serverKeys?: ServerKeys,
  salt = crypto.getRandomValues(new Uint8Array(16))
) {
  const { privateKey, publicKey: serverPublic } =
    serverKeys ?? (await generateServerKeys())
  const clientPublic = fromBase64Url(target.p256dh)
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  // workers-types names the WebCrypto `public` member `$public`; the runtime reads `public`.
  const ecdh = { name: 'ECDH', public: clientKey }
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      ecdh as unknown as SubtleCryptoDeriveKeyAlgorithm,
      privateKey,
      256
    )
  )

  const keyInfo = concat(
    encoder.encode('WebPush: info\0'),
    clientPublic,
    serverPublic
  )
  const ikm = await hkdf(fromBase64Url(target.auth), sharedSecret, keyInfo, 32)
  const contentKey = await hkdf(
    salt,
    ikm,
    encoder.encode('Content-Encoding: aes128gcm\0'),
    16
  )
  const nonce = await hkdf(
    salt,
    ikm,
    encoder.encode('Content-Encoding: nonce\0'),
    12
  )

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentKey,
    'AES-GCM',
    false,
    ['encrypt']
  )
  const lastRecord = concat(payload, new Uint8Array([2]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      lastRecord
    )
  )

  const header = new Uint8Array(21)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, RECORD_SIZE)
  header[20] = serverPublic.length
  return concat(header, serverPublic, ciphertext)
}

export async function vapidAuthorization(
  endpoint: string,
  vapid: VapidKeys,
  now = Date.now()
) {
  const publicKey = fromBase64Url(vapid.publicKey)
  const signingKey = await crypto.subtle.importKey(
    'jwk',
    p256Jwk(publicKey, fromBase64Url(vapid.privateKey)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const encodeJson = (value: object) =>
    toBase64Url(encoder.encode(JSON.stringify(value)))
  const unsigned = `${encodeJson({ typ: 'JWT', alg: 'ES256' })}.${encodeJson({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + JWT_LIFETIME_SECONDS,
    sub: vapid.subject,
  })}`
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    encoder.encode(unsigned)
  )
  const token = `${unsigned}.${toBase64Url(new Uint8Array(signature))}`
  return `vapid t=${token}, k=${vapid.publicKey}`
}

export async function sendPush(
  target: PushTarget,
  message: object,
  vapid: VapidKeys
) {
  const body = await encryptPayload(
    encoder.encode(JSON.stringify(message)),
    target
  )
  return fetch(target.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidAuthorization(target.endpoint, vapid),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(TTL_SECONDS),
      urgency: 'normal',
    },
    body,
  })
}
