// Runs in Node: answers every outbound fetch the Worker makes during tests.

export const PASSING_TURNSTILE_TOKEN = 'token-ok'

const PAGES: Record<string, { body: string; type?: string; status?: number }> =
  {
    'https://projeto.dev/': {
      body: `<!doctype html><html><head>
      <title>  Projeto
        Legal </title>
      <meta name="description" content="Um projeto brasileiro de tecnologia.">
      <meta property="og:image" content="/capa.png">
      <link rel="icon" href="/favicon.ico">
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#000000">
    </head><body></body></html>`,
    },
    'https://projeto.dev/manifest.json': {
      body: '{"theme_color": "#E53"}',
      type: 'application/json',
    },
    'https://simples.dev/': {
      body: `<html><head><meta property="og:title" content="Simples">
      <link rel="shortcut icon" href="icone.png">
      <meta name="theme-color" content="rebeccapurple"></head></html>`,
    },
    'https://pdf.dev/': { body: '%PDF', type: 'application/pdf' },
    'https://enorme.dev/': {
      body: `<html><head><title>Enorme</title></head><body>${'a'.repeat(3 * 1024 * 1024)}<title>Ignorado</title></body></html>`,
    },
  }

export async function fakeInternet(request: Request) {
  const url = new URL(request.url)

  if (url.hostname === 'challenges.cloudflare.com') {
    const form = await request.formData()
    const success = form.get('response') === PASSING_TURNSTILE_TOKEN
    return Response.json({ success })
  }

  const page = PAGES[url.href]
  if (!page) return new Response('not found', { status: 404 })

  return new Response(page.body, {
    status: page.status ?? 200,
    headers: { 'content-type': page.type ?? 'text/html; charset=utf-8' },
  })
}
