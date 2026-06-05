import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-[var(--shadow-xs)]",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
