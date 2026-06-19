import type { FulfillmentProvider } from './providers'

export interface Product {
  id: string
  projectId: string
  imageId: string
  sku: string
  title: string
  description: string | null
  tags: string[]
  fulfillmentProvider: FulfillmentProvider
  externalProductId: string | null
  printProviderId: string | null
  blueprintId: string | null
  status: 'draft' | 'created' | 'published' | 'failed' | 'archived'
  publishedAt: Date | null
  errorMessage: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
