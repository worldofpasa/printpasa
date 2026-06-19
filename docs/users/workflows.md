# Workflows

This guide covers day-to-day project operations: resuming work, navigating stages, filtering the dashboard, forking projects, and re-running generation steps.

## Pipeline Overview

Every project moves through seven linear stages:

```
Gather Idea → Idea Validator → Image Prompts → Image Generate
  → Image Optimization → Product Placement → Manual Review
```

Rules:

- **Forward progress** requires meeting each stage’s readiness checks (selections, saves, or created products).
- **Backward navigation** is always allowed to any stage at or before your furthest reached stage.
- **Completed projects** unlock all stages for read-only review.
- **Archived projects** are view-only—workflow actions are disabled.

## Resuming a Project

### From the dashboard

1. Find your project on the dashboard (use filters if needed).
2. Click the project card—navigation goes to `/projects/{slug}/stage/{currentStage}`.
3. The **Workflow stepper** (left sidebar on desktop, horizontal scroll on mobile) shows progress.
4. Complete pending actions until the footer reads **Ready to continue**.
5. Click **Continue to {next stage}**.

The dashboard **Resume** label indicates the project’s `currentStage` field—the last stage you advanced to—not necessarily where unfinished work remains. You may need to navigate backward in the stepper if you advanced before finishing selections.

### Stage navigation

Click any **accessible** stage in the stepper (completed or current). Locked stages (beyond your max reached stage) cannot be opened.

Use **Previous stage** in the footer to move back one step.

## Dashboard Filters

Filter projects on the home dashboard to manage large queues:

| Filter | Shows |
|--------|-------|
| All projects | Everything |
| Active | In-progress, not in manual review |
| Needs review | Active projects at Stage 7 (manual review) |
| Completed | Published / marked complete |
| Archived | Archived status |

Additional filters:

- **Creator** — Portal, Telegram, Cron, or specific `originActor` username
- **Created date** — Single day or date range

Filters combine (AND logic). Clear date filters with **Clear** in the date picker.

## Forking a Project

Forking creates a **copy** of a project branched from a chosen stage—useful for exploring alternate prompts or images without losing the original.

### How to fork

1. Open the project at any stage.
2. Click **Fork project** in the stage page header/toolbar.
3. Enter a name for the fork (default: `{Original name} (Fork)`).
4. Confirm—the fork target is the **current stage** you are viewing.

### What gets copied

| Data | Copied to fork? |
|------|-----------------|
| Themes | Always |
| Active prompts | If fork stage ≥ Image Prompts |
| Active images | If fork stage ≥ Image Generate |
| Products | If fork stage ≥ Product Placement |

Superseded prompts and images stay on the parent project only. The fork receives new IDs and a unique slug/SKU suffix.

### When to fork

- Before **destructive regeneration** in Stages 3 or 4
- To test a different image provider on the same prompts
- To split a successful line into variant projects

See [Stage 3](./stage-3-image-prompts.md) and [Stage 4](./stage-4-image-generate.md) for regeneration warnings.

## Re-Running Stages

| Stage | Re-run action | Destructive? |
|-------|---------------|--------------|
| 1 Gather Idea | Generate themes | **No** — appends themes |
| 2 Idea Validator | Run validation | **No** — updates scores; manual winner save |
| 3 Image Prompts | Generate prompts | **Yes** — supersedes active prompts |
| 4 Image Generate | Batch or per-card generate | **Yes** — supersedes active images |
| 5 Image Optimization | Re-run bg/upscale | Replaces that variant |
| 6 Product Placement | Create more products | **No** — appends products |
| 7 Manual Review | Publish again | **No** — retries provider publish |

### Safe re-run workflow

1. Navigate back to the target stage via the stepper.
2. For Stages 3–4, fork first if you need to preserve current output.
3. Run the generation action.
4. Re-select items (selection flags may reset on new records).
5. Advance again when ready—downstream stages may need re-work if selections changed.

### Changing selections without regen

- **Stage 1**: Change selected themes and **Save selection**—does not delete themes.
- **Stage 3**: Toggle prompt selection or edit text—independent of full generate.
- **Stage 4**: Toggle image selection or single-card regenerate.
- **Stage 5**: Re-process individual images.

Downstream stages ignore unselected items but retain superseded records in the database.

## Project Status Lifecycle

```
active → completed
active → archived → active (unarchive)
active → deleted (permanent)
```

| Status | Dashboard chip | Behavior |
|--------|----------------|----------|
| active | In production / Needs review | Full workflow |
| completed | Published | All stages viewable |
| archived | Archived | View-only in stages |

Edit name/description from the dashboard **⋯** menu anytime.

## Origins: Portal, Telegram, Cron

Projects record how they were created:

- **Portal** — Created in the web UI
- **Telegram** — Started via `/idea` bot command
- **Cron** — Created by a scheduled pipeline job

Use the **Creator** filter to audit automated vs. manual work.

## Related Guides

- [Getting Started](./getting-started.md)
- [Stage 3: Image Prompts](./stage-3-image-prompts.md)
- [Stage 4: Image Generate](./stage-4-image-generate.md)
- [Telegram Bot](./telegram-bot.md)
