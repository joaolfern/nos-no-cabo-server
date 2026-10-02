const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const LENGTH = 6

export function shortCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}
