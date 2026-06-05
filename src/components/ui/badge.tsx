import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-sm border font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        subtle: "border-border-subtle bg-surface-muted text-muted-foreground",
        success: "border-success/20 bg-success-soft text-success",
        warning: "border-warning/20 bg-warning-soft text-warning",
        destructive:
          "border-destructive/20 bg-destructive-soft text-destructive",
        ai: "border-accent/20 bg-accent-soft text-accent",
      },
      size: {
        sm: "min-h-5 px-1.5 py-0.5 text-[11px]",
        md: "min-h-6 px-2 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "subtle",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { Badge, badgeVariants };
