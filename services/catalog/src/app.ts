import { Hono } from 'hono'
import { listCategories } from './db/websites'
import type { AppContext } from './env'
import { PUBLIC_LIST_CACHE } from './lib/cache'
import { apiError } from './lib/errors'
import { websites } from './routes/websites'

export const app = new Hono<AppContext>().basePath('/v1')

app.route('/websites', websites)
app.get('/categories', async (c) => {
  c.header('cache-control', PUBLIC_LIST_CACHE)
  return c.json(await listCategories(c.env.DB))
})

app.notFound((c) => apiError(c, 404, 'not_found', 'Rota não encontrada.'))
app.onError((error, c) => {
  console.error(error)
  return apiError(c, 500, 'internal', 'Algo deu errado. Tente de novo.')
})
