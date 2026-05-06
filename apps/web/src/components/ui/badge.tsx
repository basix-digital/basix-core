import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/12 text-primary",
        neutral: "border-border bg-secondary text-muted-foreground",
        warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
        danger: "border-red-400/25 bg-red-400/10 text-red-300",
        accent: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
