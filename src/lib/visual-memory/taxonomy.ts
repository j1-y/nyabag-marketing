import type { VisualRequirement } from "./types";

type TaxonomyEntry = Omit<VisualRequirement, "required">;

export const VISUAL_TAXONOMY: TaxonomyEntry[] = [
  { concept: "hero", label: "Hero", category: "section", weight: 3, terms: ["hero", "above fold", "header section", "main section"] },
  { concept: "navbar", label: "Navbar", category: "section", weight: 2, terms: ["navbar", "navigation", "header nav", "top nav"] },
  { concept: "footer", label: "Footer", category: "section", weight: 2, terms: ["footer", "bottom section"] },
  { concept: "pricing", label: "Pricing", category: "section", weight: 3, terms: ["pricing", "plans", "price", "monthly", "yearly", "annual"] },
  { concept: "dashboard", label: "Dashboard", category: "section", weight: 3, terms: ["dashboard", "analytics", "app shell", "admin", "metrics"] },
  { concept: "table", label: "Table", category: "component", weight: 3, terms: ["table", "data table", "rows", "columns"] },
  { concept: "search_bar", label: "Search bar", category: "component", weight: 4, terms: ["search bar", "search input", "search box", "search field", "input bar", "find bar", "ask bar"] },
  { concept: "input_field", label: "Input", category: "component", weight: 2, terms: ["input", "text field", "form field"] },
  { concept: "form", label: "Form", category: "component", weight: 2, terms: ["form", "signup form", "email capture", "lead capture"] },
  { concept: "logo_strip", label: "Logo strip", category: "component", weight: 4, terms: ["logo strip", "company logos", "customer logos", "brand row", "logos", "trusted by", "used by", "partners"] },
  { concept: "product_mockup", label: "Product mockup", category: "component", weight: 3, terms: ["product mockup", "app mockup", "floating mockup", "product screenshot", "browser frame", "phone mockup", "laptop mockup"] },
  { concept: "sidebar", label: "Sidebar", category: "component", weight: 3, terms: ["sidebar", "side nav", "left rail"] },
  { concept: "metric_card", label: "Metric cards", category: "component", weight: 3, terms: ["metric card", "metric cards", "stat cards", "stats cards", "kpi cards"] },
  { concept: "cards", label: "Cards", category: "component", weight: 2, terms: ["cards", "card grid", "rounded cards", "feature cards"] },
  { concept: "bento_grid", label: "Bento grid", category: "pattern", weight: 4, terms: ["bento", "bento grid", "modular grid"] },
  { concept: "toggle", label: "Toggle", category: "component", weight: 3, terms: ["toggle", "monthly yearly toggle", "monthly yearly", "segmented control", "switch"] },
  { concept: "filters", label: "Filters", category: "component", weight: 2, terms: ["filter", "filters", "filter bar"] },
  { concept: "bottom_navigation", label: "Bottom navigation", category: "component", weight: 3, terms: ["bottom navigation", "bottom nav", "tab bar"] },
  { concept: "pill_button", label: "Pill buttons", category: "component", weight: 2, terms: ["pill button", "pill buttons", "capsule button", "rounded button"] },
  { concept: "cta", label: "CTA", category: "component", weight: 2, terms: ["cta", "call to action", "start free", "book demo", "get started"] },
  { concept: "dark_ui", label: "Dark UI", category: "color", weight: 3, terms: ["dark", "black", "charcoal", "midnight", "dark ui", "dark dashboard", "black background"] },
  { concept: "light_ui", label: "Light UI", category: "color", weight: 2, terms: ["light", "white", "airy", "off white", "light ui"] },
  { concept: "gradient", label: "Gradient", category: "style", weight: 2, terms: ["gradient", "mesh gradient", "radial gradient"] },
  { concept: "minimal", label: "Minimal", category: "style", weight: 2, terms: ["minimal", "minimalist", "clean", "sparse"] },
  { concept: "serif_typography", label: "Serif type", category: "style", weight: 2, terms: ["serif", "serif typography", "editorial typography"] },
  { concept: "rounded_cards", label: "Rounded cards", category: "style", weight: 2, terms: ["rounded cards", "rounded rectangles", "soft cards"] },
  { concept: "black_background", label: "Black background", category: "color", weight: 3, terms: ["black background", "black footer", "black section"] },
  { concept: "mobile_screen", label: "Mobile screen", category: "layout", weight: 3, terms: ["mobile app", "mobile screen", "phone screen"] },
];

export function normalizeConcept(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function conceptToLabel(concept: string) {
  const found = VISUAL_TAXONOMY.find((entry) => entry.concept === concept);
  if (found) return found.label;

  return concept
    .replace(/[-_]+/g, " ")
    .replace(/\bui\b/gi, "UI")
    .replace(/\bcta\b/gi, "CTA")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function uniqueStrings(values: Array<string | null | undefined>, limit = 30) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const next = String(value ?? "").trim();
    if (!next) continue;
    const key = normalizeConcept(next);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(next);
    if (result.length >= limit) break;
  }

  return result;
}

export function taxonomyEntryForConcept(concept: string) {
  return VISUAL_TAXONOMY.find((entry) => entry.concept === concept);
}

