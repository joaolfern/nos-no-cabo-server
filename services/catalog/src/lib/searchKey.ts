// "Diário" and "diario" must match: lowercase and strip accents on both sides.
export function toSearchKey(...parts: string[]) {
  return parts
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
