import type { ReportReason } from '@nosnocabo/contract'
import { EmailMessage } from 'cloudflare:email'

const REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: 'Conteúdo impróprio',
  spam: 'Spam ou golpe',
  broken: 'Site fora do ar',
  impersonation: 'Se passa por outro projeto',
  other: 'Outro motivo',
}

export type ReportAlert = {
  website: { id: string; name: string; url: string }
  reason: ReportReason
  comment?: string | null
}

type Addressing = { from: string; to: string; homeUrl: string; now: number }

export type AlertEnv = {
  ALERT_EMAIL?: SendEmail
  ALERT_FROM?: string
  ALERT_TO?: string
  HOME_URL: string
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

// RFC 2047: user text in a header is base64-encoded, so it can't break out into new headers.
function encodeHeader(text: string) {
  const bytes = new TextEncoder().encode(text)
  return `=?UTF-8?B?${btoa(String.fromCharCode(...bytes))}?=`
}

export function reportAlertEmail(alert: ReportAlert, addressing: Addressing) {
  const domain = addressing.from.split('@')[1]
  const { website } = alert
  const body = [
    `${oneLine(website.name)} recebeu uma denúncia e foi marcado para revisão.`,
    '',
    `Site: ${website.url}`,
    `Motivo: ${REASON_LABELS[alert.reason]}`,
    ...(alert.comment ? [`Comentário: ${alert.comment}`] : []),
    `Página: ${addressing.homeUrl}website/${website.id}`,
    '',
    'O site continua publicado até você decidir. Para revisar: pnpm run review:staging list',
  ].join('\r\n')

  return [
    `From: ${encodeHeader('Nós no Cabo')} <${addressing.from}>`,
    `To: ${addressing.to}`,
    `Subject: ${encodeHeader(`Denúncia: ${oneLine(website.name)}`)}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `Date: ${new Date(addressing.now).toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n')
}

// Skipped until Email Routing is set up on a domain we own; a failure never blocks the report.
export async function sendReportAlert(env: AlertEnv, alert: ReportAlert) {
  const { ALERT_EMAIL, ALERT_FROM, ALERT_TO } = env
  if (!ALERT_EMAIL || !ALERT_FROM || !ALERT_TO) return

  const raw = reportAlertEmail(alert, {
    from: ALERT_FROM,
    to: ALERT_TO,
    homeUrl: env.HOME_URL,
    now: Date.now(),
  })
  try {
    await ALERT_EMAIL.send(new EmailMessage(ALERT_FROM, ALERT_TO, raw))
  } catch (error) {
    console.error(error)
  }
}
