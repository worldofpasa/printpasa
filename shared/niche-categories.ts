export type ProductCategory = 'tshirt' | 'hoodie' | 'tanktop' | 'cap' | 'tote' | 'cup'

const NICHE_CATEGORY_MAP: Record<string, ProductCategory[]> = {
  'gen-z':        ['tshirt', 'hoodie', 'cap'],
  'millennials':  ['tshirt', 'hoodie', 'tote', 'cup'],
  'streetwear':   ['tshirt', 'hoodie', 'cap'],
  'fitness':      ['tshirt', 'tanktop'],
  'beach':        ['tanktop', 'tote'],
  'outdoor':      ['tshirt', 'cap', 'tote'],
  'gamer':        ['tshirt', 'cup', 'hoodie'],
  'office':       ['tote', 'cup'],
  'moms':         ['tshirt', 'tote', 'cup'],
  'dads':         ['tshirt', 'cap', 'cup'],
  'pets':         ['tshirt', 'tote', 'cup'],
  'nurse':        ['tshirt', 'cup'],
  'teacher':      ['tshirt', 'tote', 'cup'],
  'foodie':       ['tshirt', 'cup', 'tote'],
}

export function getRecommendedCategories(niche: string | null | undefined): ProductCategory[] {
  if (!niche) return []
  const key = niche.toLowerCase().trim()
  return NICHE_CATEGORY_MAP[key] ?? []
}

