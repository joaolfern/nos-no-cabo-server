import { describe, expect, it } from 'vitest'
import { detectWidget } from '../src/detectWidget'

const HOME_HOSTS = ['nosnocabo.pages.dev', 'nosnocabo.com.br']
const page = (body: string) =>
  new Response(`<html><body>${body}</body></html>`, {
    headers: { 'content-type': 'text/html' },
  })
const detect = (body: string) => detectWidget(page(body), '01SITE', HOME_HOSTS)

describe('detectWidget', () => {
  it('finds the widget with this site id and a link home', async () => {
    expect(
      await detect(
        '<aside class="nnc-w" data-nnc-widget="01SITE"><div><a href="https://nosnocabo.pages.dev/">Nós no Cabo</a></div></aside>'
      )
    ).toBe(true)
  })

  it('accepts any of the home hosts, with or without www', async () => {
    expect(
      await detect(
        '<div data-nnc-widget="01SITE"><a href="https://www.nosnocabo.com.br/ring/01SITE/next">→</a></div>'
      )
    ).toBe(true)
  })

  it('rejects a snippet copied from another site', async () => {
    expect(
      await detect(
        '<aside data-nnc-widget="01OTHER"><a href="https://nosnocabo.pages.dev/">Nós no Cabo</a></aside>'
      )
    ).toBe(false)
  })

  it('needs the home link inside the widget', async () => {
    expect(
      await detect(
        '<aside data-nnc-widget="01SITE">selo</aside><a href="https://nosnocabo.pages.dev/">Nós no Cabo</a>'
      )
    ).toBe(false)
    expect(
      await detect(
        '<aside data-nnc-widget="01SITE"><a href="https://outro.dev/">outro</a><a href="/local">x</a></aside>'
      )
    ).toBe(false)
  })
})
