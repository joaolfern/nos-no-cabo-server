const FETCH_TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 1024 * 1024
const USER_AGENT = 'NosNoCaboBot/1.0 (+https://nosnocabo.pages.dev)'

function limitBody(response: Response) {
  let received = 0
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength
      if (received > MAX_PAGE_BYTES) return controller.terminate()
      controller.enqueue(chunk)
    },
  })
  return new Response(response.body?.pipeThrough(limiter), response)
}

export async function fetchPage(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const isHtml = response.headers.get('content-type')?.includes('text/html')
    return response.ok && isHtml ? limitBody(response) : null
  } catch {
    return null
  }
}
