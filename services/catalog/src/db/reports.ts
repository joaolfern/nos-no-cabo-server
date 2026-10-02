import type { ReportReason } from '@nosnocabo/contract'

export type NewReport = {
  websiteId: string
  reason: ReportReason
  comment: string | null
  reporterIpHash: string
}

// One report per IP per site: repeating it doesn't add to the count.
export async function addReport(db: D1Database, report: NewReport) {
  const results = await db.batch<{ total: number }>([
    db
      .prepare(
        `INSERT OR IGNORE INTO reports (website_id, reason, comment, reporter_ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        report.websiteId,
        report.reason,
        report.comment,
        report.reporterIpHash,
        Date.now()
      ),
    db
      .prepare('SELECT COUNT(*) AS total FROM reports WHERE website_id = ?')
      .bind(report.websiteId),
  ])

  return results[1]?.results[0]?.total ?? 0
}

export async function holdReported(db: D1Database, websiteId: string) {
  await db
    .prepare(
      `UPDATE websites SET status = 'checking', review_flag = 'reported'
       WHERE id = ? AND status = 'published'`
    )
    .bind(websiteId)
    .run()
}
