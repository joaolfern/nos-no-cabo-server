const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function encode(value: number, length: number) {
  let output = ''
  for (let i = 0; i < length; i++) {
    output = ALPHABET[value % 32] + output
    value = Math.floor(value / 32)
  }
  return output
}

// Sortable by creation time and not guessable (ULID: 48-bit time + 80 random bits).
export function ulid(now = Date.now()) {
  const random = crypto.getRandomValues(new Uint8Array(16))
  const randomPart = Array.from(random, (byte) => ALPHABET[byte % 32]).join('')

  return encode(now, 10) + randomPart
}
