import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
  {
    variants: {
      variant: {
        default: "border-black/10 bg-slate-950 text-white",
        muted: "border-black/10 bg-slate-950/5 text-slate-600",
        accent: "border-amber-200 bg-amber-50 text-amber-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        destructive: "border-rose-200 bg-rose-50 text-rose-700",
        outline: "border-black/15 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
