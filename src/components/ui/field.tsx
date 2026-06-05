import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn("text-xs font-medium", className)} {...props} />
));
FieldLabel.displayName = "FieldLabel";

function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs leading-5 text-muted-foreground", className)} {...props} />;
}

function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs font-medium leading-5 text-destructive", className)}
      role="alert"
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldHint, FieldError };
