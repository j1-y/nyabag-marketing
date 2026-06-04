"use client";

import { SparkleIcon } from "@phosphor-icons/react";

export function AIIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <SparkleIcon size={size} weight="duotone" className={className} aria-hidden="true" />;
}
