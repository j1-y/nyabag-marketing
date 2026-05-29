"use client";

import { useMemo, useState } from "react";

type ColorToken = {
  label: string;
  color: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function colorDistance(a: string, b: string): number {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function nearestColor(colors: string[], target: string, fallback: string): string {
  if (!colors.length) return fallback;
  return colors.reduce((best, color) =>
    colorDistance(color, target) < colorDistance(best, target) ? color : best
  );
}

function pickByRank(colors: string[], rank: number, fallback: string): string {
  return colors[rank] ?? colors[colors.length - 1] ?? fallback;
}

function buildTokens(colors: string[]): { foundation: ColorToken[]; semantic: ColorToken[] } {
  const palette = Array.from(new Set(colors.map((color) => color.toUpperCase())));
  const byLight = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const bySaturation = [...palette].sort((a, b) => saturation(b) - saturation(a));

  const textPrimary = pickByRank(byLight, 0, "#202223");
  const textSecondary = pickByRank(
    byLight.filter((color) => luminance(color) < 0.55 && color !== textPrimary),
    0,
    "#6D7175"
  );
  const background = pickByRank([...byLight].reverse(), 0, "#F6F6F7");
  const surface = pickByRank([...byLight].reverse().filter((color) => color !== background), 0, "#FFFFFF");
  const border = pickByRank(
    [...byLight]
      .filter((color) => luminance(color) > 0.55 && color !== background && color !== surface)
      .sort((a, b) => saturation(a) - saturation(b)),
    0,
    "#E1E3E5"
  );

  const expressive = bySaturation.filter(
    (color) => ![background, surface, textPrimary, textSecondary, border].includes(color)
  );
  const primary = pickByRank(expressive, 0, pickByRank(bySaturation, 0, "#000000"));
  const secondary = pickByRank(expressive.filter((color) => color !== primary), 0, surface);
  const accent = pickByRank(
    expressive.filter((color) => color !== primary && color !== secondary),
    0,
    primary
  );

  return {
    foundation: [
      { label: "Primary", color: primary },
      { label: "Secondary", color: secondary },
      { label: "Accent", color: accent },
      { label: "Background", color: background },
      { label: "Surface", color: surface },
      { label: "Text Primary", color: textPrimary },
      { label: "Text Secondary", color: textSecondary },
      { label: "Border", color: border },
    ],
    semantic: [
      { label: "Success", color: nearestColor(palette, "#22C55E", "#22C55E") },
      { label: "Warning", color: nearestColor(palette, "#F59E0B", "#F59E0B") },
      { label: "Error", color: nearestColor(palette, "#EF4444", "#EF4444") },
    ],
  };
}

export function BookmarkColorPalette({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const tokens = useMemo(() => buildTokens(colors), [colors]);

  async function copyColor(color: string) {
    await navigator.clipboard.writeText(color);
    setCopied(color);
    window.setTimeout(() => setCopied(null), 1200);
  }

  function renderToken(token: ColorToken) {
    return (
      <button
        key={`${token.label}-${token.color}`}
        className="detail-color-card"
        type="button"
        onClick={() => copyColor(token.color)}
        title={`Copy ${token.color}`}
      >
        <span className="detail-color-preview" style={{ background: token.color }} />
        <span className="detail-color-label">{token.label}</span>
        <span className="detail-color-value">{token.color}</span>
        <span className="detail-color-copy">{copied === token.color ? "Copied" : "Copy"}</span>
      </button>
    );
  }

  return (
    <div className="detail-token-palette">
      <div className="detail-color-grid">{tokens.foundation.map(renderToken)}</div>
      <div className="detail-semantic-row">
        <p>Success / Warning / Error</p>
        <div className="detail-color-grid detail-color-grid-compact">
          {tokens.semantic.map(renderToken)}
        </div>
      </div>
    </div>
  );
}
