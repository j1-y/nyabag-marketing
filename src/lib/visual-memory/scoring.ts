import type {
  QueryUnderstanding,
  VisualFactsRow,
  VisualMatchLabel,
  VisualMatchStrength,
  VisualScoreBreakdown,
  VisualSearchEvidence,
} from "./types";
import { conceptToLabel, normalizeConcept, uniqueStrings } from "./taxonomy";

export type CandidateSignals = {
  bookmarkId: string;
  keyword?: number;
  lexical?: number;
  vector?: number;
  legacyVector?: number;
};

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(asText).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(asText).join(" ");
  return String(value);
}

export function buildVisualFactsHaystack(row?: VisualFactsRow | null) {
  if (!row) return "";

  return normalizeConcept([
    row.visible_text?.join(" "),
    row.visible_brands?.join(" "),
    row.detected_components?.join(" "),
    row.detected_patterns?.join(" "),
    row.detected_styles?.join(" "),
    row.detected_colors?.join(" "),
    asText(row.section_facts),
    asText(row.facts),
  ].filter(Boolean).join(" "));
}

function conceptAliases(concept: string) {
  const base = concept.replace(/_/g, " ");
  const aliases: Record<string, string[]> = {
    hero: ["hero", "above fold"],
    search_bar: ["search bar", "search input", "searchbox", "input bar", "search"],
    logo_strip: ["logo strip", "customer logo", "company logo", "brand row", "trusted by", "partner logos", "logo grid"],
    product_mockup: ["product mockup", "app mockup", "browser frame", "phone mockup", "laptop mockup", "product screenshot"],
    bento_grid: ["bento", "bento grid", "modular grid"],
    metric_card: ["metric card", "stat card", "kpi", "metrics"],
    dark_ui: ["dark ui", "dark", "black", "charcoal", "midnight"],
    light_ui: ["light ui", "light", "white", "airy"],
    serif_typography: ["serif", "serif typography", "editorial typography"],
    bottom_navigation: ["bottom navigation", "bottom nav", "tab bar"],
    pill_button: ["pill button", "rounded button", "capsule button"],
  };
  return uniqueStrings([base, ...(aliases[concept] ?? [])]).map(normalizeConcept);
}

function haystackIncludesConcept(haystack: string, concept: string) {
  return conceptAliases(concept).some((alias) => haystack.includes(alias));
}

export function scoreVisualFacts(query: QueryUnderstanding, row?: VisualFactsRow | null) {
  const haystack = buildVisualFactsHaystack(row);
  const matched: VisualSearchEvidence[] = [];
  const missing: string[] = [];
  const negativeHits: string[] = [];
  let score = 0;
  let possible = 0;

  for (const requirement of query.requirements) {
    possible += requirement.weight;
    if (haystack && haystackIncludesConcept(haystack, requirement.concept)) {
      score += requirement.weight;
      matched.push({
        concept: requirement.concept,
        label: requirement.label,
        confidence: Math.min(1, Number(row?.confidence ?? 0.65) || 0.65),
        source: "visual_facts",
        reason: `Detected ${requirement.label.toLowerCase()} in saved visual facts.`,
      });
    } else {
      missing.push(requirement.concept);
    }
  }

  for (const requirement of query.optional) {
    possible += requirement.weight * 0.6;
    if (haystack && haystackIncludesConcept(haystack, requirement.concept)) {
      score += requirement.weight * 0.6;
      matched.push({
        concept: requirement.concept,
        label: requirement.label,
        confidence: Math.min(1, Number(row?.confidence ?? 0.55) || 0.55),
        source: "visual_facts",
        reason: `Detected ${requirement.label.toLowerCase()} as supporting evidence.`,
      });
    }
  }

  for (const negative of query.negatives) {
    if (haystack && haystackIncludesConcept(haystack, negative.concept)) {
      negativeHits.push(negative.concept);
      score -= negative.weight;
      missing.push(`not_${negative.concept}`);
    }
  }

  const fact = possible > 0 ? Math.max(0, Math.min(1, score / possible)) : 0;
  return {
    fact,
    matched,
    missing: uniqueStrings(missing),
    negativeHits,
    hasFacts: Boolean(row && row.status === "completed"),
  };
}

export function classifyVisualMatch({
  query,
  factScore,
  finalScore,
  missing,
  hasFacts,
}: {
  query: QueryUnderstanding;
  factScore: number;
  finalScore: number;
  missing: string[];
  hasFacts: boolean;
}): { strength: VisualMatchStrength; label: VisualMatchLabel } {
  if (!hasFacts && query.hasVisualConstraints) return { strength: "related", label: "Related" };
  if (query.requirements.length > 0 && missing.length === 0 && factScore >= 0.88) {
    return { strength: "exact", label: "Exact visual match" };
  }
  if (factScore >= 0.68 || (missing.length <= 1 && finalScore >= 0.62)) {
    return { strength: "strong", label: "Strong visual match" };
  }
  if (factScore >= 0.35 || finalScore >= 0.45) {
    return { strength: "possible", label: "Possible match" };
  }
  return { strength: "related", label: "Related" };
}

export function buildScoreBreakdown(input: Partial<VisualScoreBreakdown>): VisualScoreBreakdown {
  return {
    final: Number(input.final ?? 0),
    fact: Number(input.fact ?? 0),
    lexical: Number(input.lexical ?? 0),
    vector: Number(input.vector ?? 0),
    legacyVector: Number(input.legacyVector ?? 0),
    keyword: Number(input.keyword ?? 0),
    rerank: Number(input.rerank ?? 0),
  };
}

export function fallbackEvidenceFromConcepts(concepts: string[]): VisualSearchEvidence[] {
  return uniqueStrings(concepts, 6).map((concept) => ({
    concept,
    label: conceptToLabel(concept),
    confidence: 0.45,
    source: "semantic",
    reason: `Related memory text mentioned ${conceptToLabel(concept).toLowerCase()}.`,
  }));
}
