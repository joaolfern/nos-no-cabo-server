const dayKey = (name: string, now: number) =>
  `${name}:${new Date(now).toISOString().slice(0, 10)}`

// One counter per UTC day, the same reset as Cloudflare's daily limits.
export async function takeDailyQuota(
  db: D1Database,
  name: string,
  limit: number,
  now = Date.now()
) {
  const key = dayKey(name, now)
  const results = await db.batch([
    db
      .prepare('DELETE FROM counters WHERE name > ? AND name < ?')
      .bind(`${name}:`, key),
    db
      .prepare('INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)')
      .bind(key),
    db
      .prepare(
        'UPDATE counters SET value = value + 1 WHERE name = ? AND value < ?'
      )
      .bind(key, limit),
  ])

  return (results[2]?.meta.changes ?? 0) > 0
}

export async function dailyQuotaUsed(
  db: D1Database,
  name: string,
  now = Date.now()
) {
  const row = await db
    .prepare('SELECT value FROM counters WHERE name = ?')
    .bind(dayKey(name, now))
    .first<{ value: number }>()
  return row?.value ?? 0
}
