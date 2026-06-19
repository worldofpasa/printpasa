import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:-translate-y-0.5 hover:bg-destructive/95",
        outline:
          "border border-input bg-white text-foreground shadow-sm hover:border-slate-400 hover:bg-slate-50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "text-slate-700 hover:bg-slate-950/5 hover:text-slate-950",
        soft: "bg-slate-950/5 text-slate-700 hover:bg-slate-950/10 hover:text-slate-950",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-11 px-5 py-2.5",
        "xs": "h-7 rounded-full px-2.5 text-[0.7rem]",
        "sm": "h-9 rounded-full px-3.5 text-xs",
        "lg": "h-12 rounded-full px-8",
        "icon": "h-10 w-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
