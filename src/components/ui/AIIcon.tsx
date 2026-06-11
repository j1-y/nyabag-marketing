"use client";

import { Sparkles } from "lucide-react";
;

export function AIIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <Sparkles size={size} weight="duotone" className={className} aria-hidden="true" />;
}
