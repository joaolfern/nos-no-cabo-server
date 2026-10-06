import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    new URL('./migrations', import.meta.url).pathname
  )

  return {
    plugins: [
      cloudflareTest({
        main: './src/index.ts',
        miniflare: {
          compatibilityDate: '2026-08-22',
          d1Databases: ['METRICS_DB'],
          bindings: {
            TEST_MIGRATIONS: migrations,
            TURNSTILE_SECRET: 'test-secret',
            VISITOR_SALT: 'test-salt',
          },
        },
      }),
    ],
    test: { setupFiles: ['./test/setup.ts'] },
  }
})
