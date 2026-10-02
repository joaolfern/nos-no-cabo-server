import { z } from 'zod'
import { CategorySlugSchema } from './website'

export const WEBSITE_SORTS = ['melhores', 'recentes', 'curtidos', 'az'] as const

export const LIST_LIMITS = { default: 24, max: 48 } as const

export const WebsiteListQuery = z.object({
  categoria: CategorySlugSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(WEBSITE_SORTS).default('melhores'),
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_LIMITS.max)
    .default(LIST_LIMITS.default),
})
export type WebsiteListQuery = z.input<typeof WebsiteListQuery>
export type ParsedWebsiteListQuery = z.output<typeof WebsiteListQuery>

export function pageOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
  })
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
  total: number
}
