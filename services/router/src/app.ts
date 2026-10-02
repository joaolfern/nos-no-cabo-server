import { type Context, Hono } from 'hono'
import type { RingSite } from '../../catalog/src/rpc'
import { type Direction, findByCode, navigate } from './ring'

const DIRECTIONS: readonly Direction[] = ['prev', 'next', 'random']
const ROBOTS = 'User-agent: *\nDisallow: /ring/\nDisallow: /r/\n'

type RouterDeps = {
  getSites: () => Promise<RingSite[] | null>
  homeUrl: () => string
  random: () => number
}

function redirect(c: Context, url: string) {
  c.header('cache-control', 'no-store')
  c.header('x-robots-tag', 'noindex')
  return c.redirect(url, 302)
}

export function createApp(deps: RouterDeps) {
  const app = new Hono()

  app.get('/ring/:id/:direction', async (c) => {
    const direction = c.req.param('direction') as Direction
    if (!DIRECTIONS.includes(direction)) return c.notFound()

    const sites = (await deps.getSites()) ?? []
    const target = navigate(sites, c.req.param('id'), direction, deps.random())
    return redirect(c, target ?? deps.homeUrl())
  })

  app.get('/r/:code', async (c) => {
    const sites = (await deps.getSites()) ?? []
    return redirect(c, findByCode(sites, c.req.param('code')) ?? deps.homeUrl())
  })

  app.get('/robots.txt', (c) => c.text(ROBOTS))

  return app
}
