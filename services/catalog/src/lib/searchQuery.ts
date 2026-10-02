const MAX_TERMS = 8

// User text never reaches FTS5 as syntax: each word becomes a quoted prefix term.
export function toMatchQuery(input: string): string | null {
  const terms = input.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? []
  if (terms.length === 0) return null

  return terms
    .slice(0, MAX_TERMS)
    .map((term) => `"${term}"*`)
    .join(' ')
}
