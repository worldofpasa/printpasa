# Stage 6: Product Placement

**Product Placement** maps your optimized designs onto catalog products and creates draft listings via your fulfillment provider.

## Goal

Create at least one **product**—a design placed on a specific blueprint (t-shirt, hoodie, etc.) with placement coordinates, ready for review and publishing in Stage 7.

## Before You Start

- Complete Stages 4 and 5 with selected, optimized images.
- Add product blueprints in **Settings → Catalog** (enabled items only appear here).
- Configure your **fulfillment provider** API key (Printify by default) in Settings and environment variables.

## Step-by-Step

### 1. Review available designs

Selected images from Stage 4/5 appear in the design picker. Each shows a thumbnail and prompt background color hint for mockup contrast.

### 2. Choose a product category

Tabs organize catalog items by category:

- T-Shirts
- Hoodies
- Tank Tops
- Caps
- Totes
- Cups

Recommended categories for your project niche may be highlighted based on the project’s niche setting.

### 3. Select catalog products

Check one or more **catalog items** (blueprints) you want to create products for. Bestseller badges indicate popular provider templates.

You must select at least one catalog item before opening the placement modal.

### 4. Open the placement editor

Click **Create products** to open the **Placement modal** for the selected design and products:

- Preview the design on each product mockup
- Drag, scale, and rotate the design within the print area
- Switch between color variants where supported
- Confirm placement per product

The editor loads design images from S3 presigned URLs—ensure CORS is configured (see [Troubleshooting](./troubleshooting.md)).

### 5. Confirm creation

Submit the modal to create products via the fulfillment provider. Each product receives:

- A unique **SKU** (format: `PP-{NICHE}-{THEME}-TEE-{SEQ}` or similar)
- An external product ID from the provider
- Draft status until published in Stage 7

Created products append to the project—they are **not deleted** when you create more.

### 6. Review created products

The stage lists products created in this session with status, SKU, and mockup previews. You can create additional batches with different designs or catalog items.

### 7. Continue

Create at least one product, then click **Continue to Manual Review**.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Created products | At least one product record in the project |

## Catalog Management

If no products appear in the category tabs:

1. Go to **Settings → Catalog**
2. Browse the provider catalog and add blueprints
3. Ensure items are **enabled**
4. Return to Stage 6 and refresh

## Tips

- Place designs high on the chest for standard t-shirt layouts; use provider safe-zone guides in the modal.
- Create products for multiple colors by selecting variants in the placement flow.
- Product creation is **append-only**—safe to experiment, but published SKUs in Stage 7 should be tracked to avoid duplicates in your store.
- Max variant count per product respects **Settings → Defaults → Max product variants**.

## Related Guides

- [Settings → Catalog](./settings.md#catalog)
- [Stage 7: Review](./stage-7-review.md)
- [Troubleshooting → Fulfillment errors](./troubleshooting.md#fulfillment-provider-errors)
