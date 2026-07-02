"use client";

import { useState } from "react";

function getReadableTextColor(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "var(--text)" : "var(--text-inverse)";
}

export function BookmarkColorPalette({
  colors,
}: {
  colors: string[];
}) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const visibleColors = Array.from(new Set(colors.map((color) => color.toUpperCase()))).slice(0, 5);

  async function copyColor(color: string) {
    await navigator.clipboard.writeText(color);
    setCopiedColor(color);
    window.setTimeout(() => setCopiedColor(null), 1200);
  }

  if (visibleColors.length === 0) {
    return (
      <div className="detail-token-palette">
        <p className="detail-color-empty">No colours extracted yet.</p>
      </div>
    );
  }

  return (
    <div className="detail-token-palette">
      <div className={`detail-color-strip detail-color-strip-${visibleColors.length}`} aria-label="Extracted color palette">
        {visibleColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            className="detail-color-segment"
            type="button"
            style={{ backgroundColor: color }}
            title={`Copy ${color}`}
            aria-label={`Copy color ${color}`}
            onClick={() => copyColor(color)}
          >
            <span style={{ color: getReadableTextColor(color) }}>
              {copiedColor === color ? "Copied" : color}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
