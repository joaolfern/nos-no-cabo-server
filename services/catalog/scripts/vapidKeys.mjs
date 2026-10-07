// Prints a VAPID key pair: the public key goes in wrangler.jsonc and the client's
// VITE_VAPID_PUBLIC_KEY, the private key in `wrangler secret put VAPID_PRIVATE_KEY`.
const pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign']
)
const publicKey = Buffer.from(
  await crypto.subtle.exportKey('raw', pair.publicKey)
).toString('base64url')
const { d } = await crypto.subtle.exportKey('jwk', pair.privateKey)

console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${d}`)
