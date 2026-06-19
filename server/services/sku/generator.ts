const NICHE_CODES: Record<string, string> = {
  'gen-z': 'GZ',
  'millennials': 'ML',
  'moms': 'MO',
  'dads': 'DA',
  'pets': 'PE',
  'nurse': 'NU',
  'teacher': 'TC',
  'gamer': 'GM',
  'fitness': 'FI',
  'foodie': 'FO',
  'custom': 'CU',
}

const PRODUCT_TYPE_CODES: Record<string, string> = {
  'tshirt': 'TEE',
  't-shirt': 'TEE',
  'hoodie': 'HOD',
  'sweatshirt': 'SWT',
  'tanktop': 'TNK',
  'tank-top': 'TNK',
  'cap': 'CAP',
  'tote': 'TOT',
  'tote-bag': 'TOT',
  'cup': 'CUP',
  'mug': 'CUP',
  'poster': 'PST',
  'sticker': 'STK',
  'phone-case': 'PHC',
}

export function generateSKU(params: {
  niche: string
  themeId: string
  productType?: string
  sequence: number
  prefix?: string
}): string {
  const skuPrefix = (params.prefix || process.env.NUXT_SKU_PREFIX || 'PP').toUpperCase()
  const nicheCode = NICHE_CODES[params.niche] || 'XX'
  const themeShort = params.themeId.slice(0, 4).toUpperCase()
  const typeCode = PRODUCT_TYPE_CODES[params.productType ?? 'tshirt'] || 'OTH'
  const seq = String(params.sequence).padStart(3, '0')
  return `${skuPrefix}-${nicheCode}-${themeShort}-${typeCode}-${seq}`
}

function shortCode(input: string | undefined, fallback: string): string {
  const cleaned = (input ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return cleaned.slice(0, 4) || fallback
}

// Per-variant SKU derived from the base product SKU plus color/size codes. The variant id
// tail is always appended so a product with several sizes per color — or any blueprint
// whose title we can't cleanly parse into size — never produces duplicate SKUs. Printify
// rejects the whole product if two variants share a SKU.
export function generateVariantSKU(baseSku: string, opts: {
  color?: string
  size?: string
  variantId?: string | number
}): string {
  const color = shortCode(opts.color, '')
  const size = shortCode(opts.size, '')
  const vid = String(opts.variantId ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()
  const parts = [color, size, vid].filter(Boolean)
  if (parts.length === 0) return `${baseSku}-V`
  return `${baseSku}-${parts.join('-')}`
}
