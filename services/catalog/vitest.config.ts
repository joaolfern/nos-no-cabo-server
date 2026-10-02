import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { readFile } from 'node:fs/promises'
import { defineConfig } from 'vitest/config'
import { fakeInternet } from './test/fakeInternet.ts'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    new URL('./migrations', import.meta.url).pathname
  )
  const rebuildSql = await readFile(
    new URL('./sql/rebuild-derived.sql', import.meta.url),
    'utf8'
  )

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            TEST_REBUILD_SQL: rebuildSql,
            TURNSTILE_SECRET: 'test-secret',
            IP_HASH_SALT: 'test-salt',
          },
          outboundService: fakeInternet,
        },
      }),
    ],
    test: { setupFiles: ['./test/setup.ts'] },
  }
})
