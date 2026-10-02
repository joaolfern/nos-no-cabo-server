import type { CatalogRpc } from '../../catalog/src/rpc'

export type Env = {
  CATALOG: Service<CatalogRpc>
  HOME_HOSTS: string
}
