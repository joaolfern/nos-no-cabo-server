import type { CatalogRpc } from '../../catalog/src/rpc'

export type Env = {
  METRICS_DB: D1Database
  CATALOG: Service<CatalogRpc>
  TURNSTILE_SECRET: string
  VISITOR_SALT: string
}
