import { z } from 'zod'
import { WebsiteStats } from './metrics'
import { Website, WebsiteNeighbours } from './website'

// Everything the website page shows, in one request. `stats` is null when metrics are down.
export const WebsitePage = z.object({
  website: Website,
  neighbours: WebsiteNeighbours,
  stats: WebsiteStats.nullable(),
})
export type WebsitePage = z.infer<typeof WebsitePage>
