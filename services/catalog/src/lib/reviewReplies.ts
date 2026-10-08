import { RejectionReason } from '@nosnocabo/contract'
import PostalMime from 'postal-mime'
import { type ReviewDecision, applyReview } from '../db/review'
import { type PushEnv, pushDecisions } from './pushNotifications'

export type ReviewReplyEnv = PushEnv & {
  ALERT_FROM?: string
  ALERT_TO?: string
  REVIEW_SECRET?: string
}

// 12 bytes of HMAC: alertas+<26-char id>.<24 hex> stays under the 64-char local-part limit.
const SIGNATURE_BYTES = 12
const ID = /^[0-9A-HJKMNP-TV-Z]{26}$/

export const REVIEW_USAGE = [
  'Responda com uma destas palavras na primeira linha:',
  '  dismiss: publica o site (ou mantém publicado) e apaga as denúncias',
  '  ban: tira o site do ar (motivo unsafe)',
  '  ban unreachable | ban error: tira do ar com outro motivo',
].join('\r\n')

async function sign(secret: string, id: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`review:${id}`)
  )
  return Array.from(new Uint8Array(mac, 0, SIGNATURE_BYTES), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

// The reply-to address carries the site id and a signature, so only a reply to a real alert acts.
export async function reviewAddress(
  env: Pick<ReviewReplyEnv, 'ALERT_FROM' | 'REVIEW_SECRET'>,
  id: string
) {
  const { ALERT_FROM, REVIEW_SECRET } = env
  if (!ALERT_FROM || !REVIEW_SECRET) return null
  const [local, domain] = ALERT_FROM.split('@')
  return `${local}+${id}.${await sign(REVIEW_SECRET, id)}@${domain}`
}

// Returns the site id when `to` is a reply-to address this worker signed.
export async function readReviewAddress(env: ReviewReplyEnv, to: string) {
  const { REVIEW_SECRET } = env
  if (!REVIEW_SECRET) return null
  const tag = /^[^+@]+\+([^.@]+)\.([0-9a-f]+)@/i.exec(to)
  if (!tag) return null
  // Mail servers may change the case of the local part.
  const id = tag[1]!.toUpperCase()
  const signature = new TextEncoder().encode(tag[2]!.toLowerCase())
  const expected = new TextEncoder().encode(await sign(REVIEW_SECRET, id))
  if (!ID.test(id) || signature.byteLength !== expected.byteLength) return null
  return crypto.subtle.timingSafeEqual(signature, expected) ? id : null
}

const QUOTE_START = [
  /^>/,
  /^-{2,}\s*(original message|mensagem original)/i,
  /^(on|em) .+(wrote|escreveu):?$/i,
]

// Reads the first line the owner wrote, above the quoted alert.
export function parseReviewCommand(text: string): ReviewDecision | null {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (QUOTE_START.some((pattern) => pattern.test(line))) return null
    if (!line) continue

    const [word, reason, ...rest] = line
      .toLowerCase()
      .replace(/[.!]+$/, '')
      .split(/\s+/)
    if (rest.length > 0) return null
    if (word === 'dismiss' && !reason) return { action: 'dismiss' }
    if (word === 'ban') {
      const parsed = RejectionReason.safeParse(reason ?? 'unsafe')
      return parsed.success ? { action: 'ban', reason: parsed.data } : null
    }
    return null
  }
  return null
}

function confirmation(name: string, decision: ReviewDecision) {
  return decision.action === 'ban'
    ? `${name} foi tirado do ar (${decision.reason}).`
    : `${name} continua publicado e as denúncias foram apagadas.`
}

// Email Routing hands replies to alertas+<id>.<signature>@ to this handler.
export async function handleReviewReply(
  message: ForwardableEmailMessage,
  env: ReviewReplyEnv
) {
  const id = await readReviewAddress(env, message.to)
  if (!id) {
    message.setReject('Unknown address')
    return
  }
  if (message.from.toLowerCase() !== env.ALERT_TO?.toLowerCase()) {
    message.setReject('Only the site owner can review reports')
    return
  }

  const email = await PostalMime.parse(message.raw)
  const decision = parseReviewCommand(email.text ?? '')
  let text: string
  if (!decision) {
    text = `Não entendi a resposta.\r\n\r\n${REVIEW_USAGE}`
  } else {
    const name = await applyReview(env.DB, id, decision)
    if (name) await pushDecisions(env, id)
    text = name ? confirmation(name, decision) : `Nenhum site com o id ${id}.`
  }

  await message.reply({
    from: message.to,
    subject: email.subject?.startsWith('Re:')
      ? email.subject
      : `Re: ${email.subject ?? 'Denúncia'}`,
    text,
  })
}
