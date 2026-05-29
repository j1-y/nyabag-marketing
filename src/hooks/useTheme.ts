"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme] = useState<"light">("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  function toggle() {
    // No-op - light theme only
  }

  return { theme, toggle };
}
