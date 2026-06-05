"use client";

import Link from "next/link";
import { useState } from "react";
import type { DesignDna } from "@/lib/types";

function getReadableTextColor(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#0a0a0a" : "#ffffff";
}

export function BookmarkColorPalette({
  colors,
  designDna,
}: {
  colors: string[];
  designDna?: DesignDna | null;
}) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const visibleColors = Array.from(new Set(colors.map((color) => color.toUpperCase()))).slice(0, 5);
  const completedDesignDna = designDna?.extraction_status === "completed" ? designDna : null;

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

      <div className="detail-color-footer">
        {completedDesignDna ? (
          <Link className="detail-color-dna-link" href={`/app/design-dna/${completedDesignDna.id}`}>
            View all colours in Design DNA
          </Link>
        ) : (
          <span className="detail-color-dna-link detail-color-dna-link-muted">
            Generate Design DNA to view all colours
          </span>
        )}
      </div>
    </div>
  );
}
