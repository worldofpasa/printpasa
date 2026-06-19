import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'

// Curated list of well-known Printify bestseller blueprint IDs.
// Source: https://printify.com/app/products/bestsellers
// Update this list when Printify's bestsellers change significantly.
const PRINTIFY_BESTSELLERS: Array<{ blueprintId: string; title: string }> = [
  { blueprintId: '12',  title: 'Bella + Canvas 3001 Unisex Jersey Short Sleeve Tee' },
  { blueprintId: '2',   title: 'Gildan 64000 Softstyle Unisex T-Shirt' },
  { blueprintId: '145', title: 'Bella + Canvas 3001 CVC Unisex Jersey Short Sleeve Tee' },
  { blueprintId: '30',  title: 'Comfort Colors 1717 Garment Dyed T-Shirt' },
  { blueprintId: '200', title: 'Next Level 3600 Unisex Cotton T-Shirt' },
  { blueprintId: '77',  title: 'Gildan 18500 Heavy Blend Hoodie' },
  { blueprintId: '6',   title: 'Bella + Canvas 3719 Unisex Sponge Fleece Pullover Hoodie' },
  { blueprintId: '87',  title: 'Bella + Canvas 3480 Unisex Jersey Tank Top' },
  { blueprintId: '71',  title: 'Otto Cap 39-165 5-Panel Mid Profile Baseball Cap' },
  { blueprintId: '74',  title: 'Yupoong 6606 Unstructured Classic Dad Cap' },
  { blueprintId: '79',  title: 'AOP+ White Glossy Mug 11oz' },
]

// Seeds bestseller rows into providerBlueprints if none exist yet.
// Called lazily on first catalog browse — no manual migration step needed.
export async function seedBestsellersIfNeeded() {
  const db = useDB()

  const existing = await db
    .select({ blueprintId: schema.providerBlueprints.blueprintId })
    .from(schema.providerBlueprints)
    .where(eq(schema.providerBlueprints.isBestseller, true))

  if (existing.length > 0) return

  await db.insert(schema.providerBlueprints).values(
    PRINTIFY_BESTSELLERS.map(b => ({
      id: crypto.randomUUID(),
      provider: 'printify' as const,
      blueprintId: b.blueprintId,
      title: b.title,
      brandName: null,
      description: null,
      imageUrl: null,
      previewImageUrl: null,
      allImages: null,
      basePrice: null,
      isBestseller: true,
      syncedAt: new Date(),
    })),
  )
}
