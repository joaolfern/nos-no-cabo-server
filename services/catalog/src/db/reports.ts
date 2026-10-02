import type { ReportReason } from '@nosnocabo/contract'

export type NewReport = {
  websiteId: string
  reason: ReportReason
  comment: string | null
  reporterIpHash: string
}

// One report per network per site: repeats from the same network are merged.
export async function addReport(db: D1Database, report: NewReport) {
  await db
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
    )
    .run()
}

export async function flagReported(db: D1Database, websiteId: string) {
  await db
    .prepare(
      `UPDATE websites SET review_flag = 'reported'
       WHERE id = ? AND status = 'published' AND review_flag IS NULL`
    )
    .bind(websiteId)
    .run()
}
