import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const notFound = () =>
  Response.json(
    { error: { code: 'not_found', message: 'Site não encontrado.' } },
    { status: 404 }
  )

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        serviceBindings: {
          CATALOG: async (request: Request) => {
            const path = new URL(request.url).pathname
            if (
              path.includes('/NADA') ||
              path === '/v1/websites/REVISAO/neighbours'
            ) {
              return notFound()
            }
            return Response.json({ path })
          },
          VERIFICATION: async (request: Request) =>
            Response.json({
              worker: 'verification',
              path: new URL(request.url).pathname,
            }),
          METRICS: async (request: Request) => {
            const path = new URL(request.url).pathname
            if (path.includes('/SEMSTATS')) {
              return new Response('down', { status: 500 })
            }
            return Response.json({ worker: 'metrics', path })
          },
        },
      },
    }),
  ],
})
