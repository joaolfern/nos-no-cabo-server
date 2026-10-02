import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        serviceBindings: {
          CATALOG: async (request: Request) =>
            Response.json({ path: new URL(request.url).pathname }),
          VERIFICATION: async (request: Request) =>
            Response.json({
              worker: 'verification',
              path: new URL(request.url).pathname,
            }),
        },
      },
    }),
  ],
})
