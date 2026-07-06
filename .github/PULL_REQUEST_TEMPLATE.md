## Summary

<!-- What does this change and why? -->

## Changes

<!-- Bullet list of notable changes -->

## Testing

<!-- How did you verify this? Which stages / providers did you exercise? -->

## Checklist

- [ ] `pnpm secrets:scan` passes (no `.env` or API keys committed)
- [ ] Follows the provider factory pattern if adding a provider (schema + `.env.example` + `nuxt.config.ts` + `shared/types/providers.ts`)
- [ ] Docs updated if env vars, setup, or behavior changed
- [ ] Preserves the linear stage progression and ownership checks (`requireUser`)
