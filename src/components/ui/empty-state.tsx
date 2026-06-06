import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="grid h-12 w-12 place-items-center rounded-[10px] border border-border bg-surface text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="grid gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export { EmptyState };
