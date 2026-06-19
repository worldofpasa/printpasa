# Stage 7: Manual Review

**Manual Review** is the final stage. You inspect created products, publish them to your connected store, and mark the project complete.

## Goal

Publish vetted products to your fulfillment provider’s store and close out the pipeline.

## Before You Start

- Complete Stage 6 with at least one created product.
- Verify fulfillment provider credentials and store connection are working.
- Review mockups for placement, spelling (if text designs), and color accuracy.

## Step-by-Step

### 1. Open the review workspace

Products are organized in tabs:

| Tab | Contents |
|-----|----------|
| **Drafts** | Products created but not yet published (`created`, `draft`) |
| **Published** | Products successfully sent to the store |
| **Archived** | Products removed from active selling |

### 2. Inspect mockups

Each product row shows:

- SKU and product title
- Status badge
- Mockup thumbnail (click to enlarge)
- External provider link where available

Click a mockup for full-size preview. Press Escape to close.

### 3. Select products to publish

In the **Drafts** tab:

- Check individual products, or
- Use **Select all drafts** for batch publish

Only selected drafts are included in the publish action.

### 4. Publish to store

Click **Publish selected**. PrintPasa calls your fulfillment provider to push products live (or to provider draft state, depending on provider settings).

Progress and errors appear inline. Failed publishes retain draft status—fix provider issues and retry.

### 5. Handle failures

Failed products show a destructive status badge. Common issues:

- Store not connected in provider dashboard
- Invalid API token
- Product missing required variants
- Provider rate limits

Check the provider dashboard and [Troubleshooting](./troubleshooting.md#fulfillment-provider-errors).

### 6. Archive or manage published items

Move underperforming or test products to **Archived** from the row actions. Archived products remain in PrintPasa but are excluded from batch republish flows.

### 7. Complete the project

When all intended products are published, click **Mark project complete**. This sets project status to **completed** and shows **Published** on the dashboard.

Completed projects remain accessible—all stages unlock for read-only review. You can still view audit history and mockups.

## Advancement Requirements

Stage 7 is the **final stage**. There is no “next stage” button. Completion is optional but recommended for dashboard hygiene.

| Action | Effect |
|--------|--------|
| Publish | Products go live via fulfillment provider |
| Mark complete | Dashboard status → Completed |
| Archive project | Dashboard filter → Archived (from project menu) |

## Re-Opening Completed Projects

Navigate to the project from the dashboard. All stages are accessible. You can:

- Publish additional drafts created after initial completion
- View published product status
- Fork the project to start a variant line (see [Workflows](./workflows.md))

Publishing and completion do **not** delete workflow data.

## Tips

- Publish in small batches first to verify store integration before bulk publish.
- Keep SKUs consistent with your external inventory system—the app generates SKUs at creation time.
- Superusers can audit publish actions in **Audit Logs** (see [Superuser](./superuser.md)).

## Related Guides

- [Workflows → Resume and filters](./workflows.md)
- [Stage 6: Product Placement](./stage-6-product-placement.md)
- [Getting Started → Dashboard](./getting-started.md#the-dashboard)
