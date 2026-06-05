import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<ButtonProps, "children"> & {
  children: React.ReactNode;
  label?: string;
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, label, "aria-label": ariaLabel, title, size = "icon", ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      className={cn("gap-0", className)}
      aria-label={ariaLabel ?? label ?? title}
      title={title ?? label}
      {...props}
    >
      {children}
    </Button>
  )
);
IconButton.displayName = "IconButton";

export { IconButton };
