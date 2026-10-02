import type { ApiErrorResponse, WebsitePreview } from '@nosnocabo/contract'
import { describe, expect, it } from 'vitest'
import { SUBMISSION, get, submit } from './api'

const preview = (url: string) =>
  get(`/websites/preview?url=${encodeURIComponent(url)}`)

describe('GET /v1/websites/preview', () => {
  it('scrapes title, description, image and the manifest colour', async () => {
    const response = await preview('projeto.dev')

    expect(response.status).toBe(200)
    expect((await response.json()) as WebsitePreview).toEqual({
      url: 'https://projeto.dev/',
      name: 'Projeto Legal',
      description: 'Um projeto brasileiro de tecnologia.',
      faviconUrl: 'https://projeto.dev/capa.png',
      color: '#ee5533',
    })
  })

  it('falls back to og:title and the icon, and drops non-hex colours', async () => {
    const body = (await (
      await preview('https://simples.dev')
    ).json()) as WebsitePreview

    expect(body).toMatchObject({
      name: 'Simples',
      description: null,
      faviconUrl: 'https://simples.dev/icone.png',
      color: null,
    })
  })

  it('reads only the first megabyte of a page', async () => {
    const response = await preview('https://enorme.dev')

    expect(response.status).toBe(200)
    expect(((await response.json()) as WebsitePreview).name).toBe('Enorme')
  })

  it('answers unreachable for missing pages and non-HTML', async () => {
    for (const url of ['https://sumiu.dev', 'https://pdf.dev']) {
      const response = await preview(url)
      expect(response.status).toBe(422)
      expect(((await response.json()) as ApiErrorResponse).error.code).toBe(
        'unreachable'
      )
    }
  })

  it('answers invalid for bad input and duplicate for listed sites', async () => {
    expect((await preview('não é url')).status).toBe(422)

    await submit(SUBMISSION)
    const duplicate = await preview('meu-projeto.dev')
    expect(duplicate.status).toBe(409)
  })
})
