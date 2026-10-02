import { z } from 'zod'
import { CATEGORY_SLUGS } from './categories'
import { toAbsoluteUrl } from './url'

export const WEBSITE_LIMITS = {
  nameMin: 3,
  nameMax: 80,
  descriptionMax: 280,
  categoriesMin: 1,
  categoriesMax: 3,
} as const

export const CategorySlugSchema = z.enum(CATEGORY_SLUGS)

export const WebsiteStatus = z.enum(['checking', 'published', 'rejected'])
export type WebsiteStatus = z.infer<typeof WebsiteStatus>

export const RejectionReason = z.enum(['unsafe', 'unreachable', 'error'])
export type RejectionReason = z.infer<typeof RejectionReason>

const HEX_COLOR = /^#[0-9a-f]{6}$/i

const WebUrl = z
  .string()
  .trim()
  .refine((value) => toAbsoluteUrl(value) !== null, 'Endereço inválido.')

export const WebsitePreview = z.object({
  url: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  faviconUrl: z.string().nullable(),
})
export type WebsitePreview = z.infer<typeof WebsitePreview>

export const WebsiteSubmission = z.object({
  url: WebUrl,
  name: z
    .string()
    .trim()
    .min(WEBSITE_LIMITS.nameMin)
    .max(WEBSITE_LIMITS.nameMax),
  description: z.string().trim().max(WEBSITE_LIMITS.descriptionMax).default(''),
  color: z.string().regex(HEX_COLOR).optional(),
  faviconUrl: WebUrl.optional(),
  repo: WebUrl.optional(),
  categories: z
    .array(CategorySlugSchema)
    .min(WEBSITE_LIMITS.categoriesMin)
    .max(WEBSITE_LIMITS.categoriesMax)
    .refine(
      (slugs) => new Set(slugs).size === slugs.length,
      'Categorias repetidas.'
    ),
})
export type WebsiteSubmission = z.input<typeof WebsiteSubmission>
export type ParsedWebsiteSubmission = z.output<typeof WebsiteSubmission>

export const Website = z.object({
  id: z.string(),
  url: z.string(),
  shortCode: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  color: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  repo: z.string().optional(),
  categories: z.array(CategorySlugSchema),
  status: WebsiteStatus,
  rejectionReason: RejectionReason.optional(),
  verifiedAt: z.string().nullable(),
  submittedAt: z.string(),
  publishedAt: z.string().nullable(),
})
export type Website = z.infer<typeof Website>

export const WebsiteStatusEntry = z.object({
  id: z.string(),
  status: WebsiteStatus,
  rejectionReason: RejectionReason.optional(),
})
export type WebsiteStatusEntry = z.infer<typeof WebsiteStatusEntry>

export const VerificationResult = z.object({
  verified: z.boolean(),
  verifiedAt: z.string().nullable(),
  reason: z.enum(['widget_not_found', 'unreachable']).optional(),
})
export type VerificationResult = z.infer<typeof VerificationResult>

export const Category = z.object({
  slug: CategorySlugSchema,
  count: z.number().int().nonnegative(),
})
export type Category = z.infer<typeof Category>

export const CategoryList = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(Category),
})
export type CategoryList = z.infer<typeof CategoryList>

export const WebsiteNeighbours = z.object({
  previous: Website.nullable(),
  next: Website.nullable(),
  random: Website.nullable(),
})
export type WebsiteNeighbours = z.infer<typeof WebsiteNeighbours>
