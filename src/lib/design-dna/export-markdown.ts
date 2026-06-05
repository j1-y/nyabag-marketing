import type { DesignDna } from "@/lib/types";

function escapeCell(value: string | null | undefined) {
  return (value || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function list(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- None detected";
}

export function getDesignDnaExportFilename(designDna: DesignDna) {
  const source = designDna.source_domain || designDna.title || "styleguide";
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `design-dna-${slug || "styleguide"}.md`;
}

export function exportDesignDnaToMarkdown(designDna: DesignDna) {
  const generated = new Date(designDna.updated_at || designDna.created_at).toISOString();
  const typographyRows = designDna.typography
    .map((item) =>
      [
        item.role,
        item.fontStack || item.fontFamily,
        item.fontSize,
        item.fontWeight,
        item.lineHeight,
        item.confidence,
        item.sample,
      ].map(escapeCell).join(" | ")
    )
    .map((row) => `| ${row} |`)
    .join("\n");

  const colorRows = designDna.colors
    .map((item) =>
      [item.name, item.hex, item.usage, item.source || "unknown"].map(escapeCell).join(" | ")
    )
    .map((row) => `| ${row} |`)
    .join("\n");

  return `# Design DNA: ${designDna.title || designDna.source_domain}

Source: ${designDna.source_url}
Domain: ${designDna.source_domain}
Extraction: HTML/CSS inferred
Generated: ${generated}

## Typography

| Role | Font | Size | Weight | Line Height | Confidence | Sample |
|---|---|---|---|---|---|---|
${typographyRows || "| No typography detected |  |  |  |  |  |  |"}

## Colors

| Name | Hex | Usage | Source |
|---|---|---|---|
${colorRows || "| No colors detected |  |  |  |"}

## Components

${list(designDna.components)}

## Layout Patterns

${list(designDna.layout_patterns)}

## Notes

Generated from source HTML/CSS. Typography is inferred from CSS rules and may not exactly match computed browser rendering.
`;
}
