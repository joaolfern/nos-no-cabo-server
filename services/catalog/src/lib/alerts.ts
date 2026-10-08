import type { ReportReason } from '@nosnocabo/contract'
import { EmailMessage } from 'cloudflare:email'
import type { ModerationOutcome, ReviewFlag } from '../db/moderation'
import { REVIEW_USAGE, reviewAddress } from './reviewReplies'

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

export type ModerationAlert = {
  website: { id: string; name: string; url: string; description: string }
  outcome: ModerationOutcome
  verdict?: string
  categoriesFlagged?: string[]
}

type Addressing = {
  from: string
  to: string
  // Signed address that turns a reply into a review decision; null without REVIEW_SECRET.
  replyTo: string | null
  homeUrl: string
  now: number
}

export type AlertEnv = {
  ALERT_EMAIL?: SendEmail
  ALERT_FROM?: string
  ALERT_TO?: string
  REVIEW_SECRET?: string
  HOME_URL: string
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

// RFC 2047: user text in a header is base64-encoded, so it can't break out into new headers.
function encodeHeader(text: string) {
  const bytes = new TextEncoder().encode(text)
  return `=?UTF-8?B?${btoa(String.fromCharCode(...bytes))}?=`
}

type Alert = { subject: string; lines: string[] }

function alertEmail(alert: Alert, addressing: Addressing) {
  const domain = addressing.from.split('@')[1]
  const body = [
    ...alert.lines,
    ...(addressing.replyTo ? ['', REVIEW_USAGE] : []),
    '',
    'Para revisar no terminal: pnpm review list',
  ].join('\r\n')

  return [
    `From: ${encodeHeader('Nós no Cabo')} <${addressing.from}>`,
    `To: ${addressing.to}`,
    ...(addressing.replyTo ? [`Reply-To: ${addressing.replyTo}`] : []),
    `Subject: ${encodeHeader(oneLine(alert.subject))}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `Date: ${new Date(addressing.now).toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n')
}

export function reportAlertEmail(alert: ReportAlert, addressing: Addressing) {
  const { website } = alert
  return alertEmail(
    {
      subject: `Denúncia: ${website.name}`,
      lines: [
        `${oneLine(website.name)} recebeu uma denúncia e foi marcado para revisão.`,
        '',
        `Site: ${website.url}`,
        `Motivo: ${REASON_LABELS[alert.reason]}`,
        ...(alert.comment ? [`Comentário: ${alert.comment}`] : []),
        `Página: ${addressing.homeUrl}website/${website.id}`,
        '',
        'O site continua publicado até você decidir.',
      ],
    },
    addressing
  )
}

const OUTCOME_SUBJECTS: Record<ModerationOutcome['decision'], string> = {
  publish: 'publicado',
  reject: 'recusado',
  hold: 'aguardando sua revisão',
}

const HOLD_REASONS: Record<ReviewFlag, string> = {
  unreachable: 'não conseguimos acessar o site',
  model_error: 'a checagem automática falhou',
  reported: 'o site foi denunciado',
}

function outcomeLine(outcome: ModerationOutcome) {
  switch (outcome.decision) {
    case 'publish':
      return 'A checagem automática aprovou e o site já está publicado.'
    case 'reject':
      return `A checagem automática recusou o site (motivo: ${outcome.reason}).`
    case 'hold':
      return `O site está esperando você decidir: ${HOLD_REASONS[outcome.flag]}.`
  }
}

export function moderationAlertEmail(
  alert: ModerationAlert,
  addressing: Addressing
) {
  const { website, outcome } = alert
  const flagged = alert.categoriesFlagged ?? []
  return alertEmail(
    {
      subject: `Novo site: ${website.name}, ${OUTCOME_SUBJECTS[outcome.decision]}`,
      lines: [
        `${oneLine(website.name)} foi enviado ao Nós no Cabo.`,
        '',
        outcomeLine(outcome),
        '',
        `Site: ${website.url}`,
        `Descrição: ${website.description}`,
        ...(alert.verdict
          ? [
              `Veredito da IA: ${alert.verdict}${flagged.length ? ` (${flagged.join(', ')})` : ''}`,
            ]
          : []),
        ...(outcome.decision === 'publish'
          ? [`Página: ${addressing.homeUrl}website/${website.id}`]
          : []),
      ],
    },
    addressing
  )
}

// Skipped until Email Routing is set up on a domain we own; a failure never blocks the caller.
async function sendAlert(
  env: AlertEnv,
  websiteId: string,
  build: (addressing: Addressing) => string
) {
  const { ALERT_EMAIL, ALERT_FROM, ALERT_TO } = env
  if (!ALERT_EMAIL || !ALERT_FROM || !ALERT_TO) return

  try {
    const raw = build({
      from: ALERT_FROM,
      to: ALERT_TO,
      replyTo: await reviewAddress(env, websiteId),
      homeUrl: env.HOME_URL,
      now: Date.now(),
    })
    await ALERT_EMAIL.send(new EmailMessage(ALERT_FROM, ALERT_TO, raw))
  } catch (error) {
    console.error(error)
  }
}

export function sendReportAlert(env: AlertEnv, alert: ReportAlert) {
  return sendAlert(env, alert.website.id, (addressing) =>
    reportAlertEmail(alert, addressing)
  )
}

// One email per new site, once moderation has decided (or held) it.
export function sendModerationAlert(env: AlertEnv, alert: ModerationAlert) {
  return sendAlert(env, alert.website.id, (addressing) =>
    moderationAlertEmail(alert, addressing)
  )
}
