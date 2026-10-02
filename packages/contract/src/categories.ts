export const CATEGORY_SLUGS = [
  'ia-e-iot',
  'educacao',
  'saude',
  'meio-ambiente',
  'cidades',
  'comunidades',
  'inclusao',
  'trabalho',
  'arte-e-cultura',
  'alimentacao',
  'outros',
] as const

export type CategorySlug = (typeof CATEGORY_SLUGS)[number]
