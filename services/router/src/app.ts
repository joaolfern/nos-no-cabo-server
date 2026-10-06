import { type Context, Hono } from 'hono'
import type { RingSite } from '../../catalog/src/rpc'
import type { Click } from '../../metrics/src/rpc'
import { type Direction, findByCode, navigate } from './ring'

const DIRECTIONS: readonly Direction[] = ['prev', 'next', 'random']
const ROBOTS = 'User-agent: *\nDisallow: /ring/\nDisallow: /r/\n'

type RouterDeps = {
  getSites: () => Promise<RingSite[] | null>
  homeUrl: () => string
  random: () => number
  recordClick: (click: Click) => void
}

function redirect(c: Context, url: string) {
  c.header('cache-control', 'no-store')
  c.header('x-robots-tag', 'noindex')
  return c.redirect(url, 302)
}

export function createApp(deps: RouterDeps) {
  const app = new Hono()

  // A missed click only makes the ranking a little less accurate; the visitor still gets through.
  function visit(c: Context, target: RingSite | null, sourceId?: string) {
    if (!target) return redirect(c, deps.homeUrl())

    if (c.req.method === 'GET') {
      try {
        deps.recordClick({
          websiteId: target.id,
          ...(sourceId && { sourceId }),
          ip: c.req.header('cf-connecting-ip') ?? '',
          userAgent: c.req.header('user-agent') ?? '',
        })
      } catch {}
    }
    return redirect(c, target.url)
  }

  app.get('/ring/:id/:direction', async (c) => {
    const direction = c.req.param('direction') as Direction
    if (!DIRECTIONS.includes(direction)) return c.notFound()

    const id = c.req.param('id')
    const sites = (await deps.getSites()) ?? []
    const target = navigate(sites, id, direction, deps.random())
    const isMember = sites.some((site) => site.id === id)
    return visit(c, target, isMember ? id : undefined)
  })

  app.get('/r/:code', async (c) => {
    const sites = (await deps.getSites()) ?? []
    return visit(c, findByCode(sites, c.req.param('code')))
  })

  app.get('/robots.txt', (c) => c.text(ROBOTS))

  return app
}
