type CursorValue = string | number | null

export function encodeCursor(values: CursorValue[]) {
  return btoa(JSON.stringify(values))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeCursor(cursor: string): CursorValue[] | null {
  try {
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')
    const values: unknown = JSON.parse(atob(base64))
    return Array.isArray(values) ? (values as CursorValue[]) : null
  } catch {
    return null
  }
}
