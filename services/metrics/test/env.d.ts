import type { D1Migration } from 'cloudflare:test'
import type { Env as MetricsEnv } from '../src/env'

declare global {
  namespace Cloudflare {
    interface Env extends MetricsEnv {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
