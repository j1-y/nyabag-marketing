import type { QueryUnderstanding, VisualRequirement } from "./types";
import { VISUAL_TAXONOMY, normalizeConcept, uniqueStrings } from "./taxonomy";

const NEGATION_PREFIXES = [
  "no",
  "not",
  "without",
  "exclude",
  "excluding",
  "avoid",
];

function hasTerm(text: string, term: string) {
  const normalizedTerm = normalizeConcept(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|\\s)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

function isNegated(text: string, term: string) {
  const normalizedTerm = normalizeConcept(term);
  return NEGATION_PREFIXES.some((prefix) => hasTerm(text, `${prefix} ${normalizedTerm}`));
}

function buildRequirement(entry: (typeof VISUAL_TAXONOMY)[number], required: boolean): VisualRequirement {
  return {
    concept: entry.concept,
    label: entry.label,
    category: entry.category,
    terms: entry.terms,
    weight: entry.weight,
    required,
  };
}

export function understandVisualQuery(query: string): QueryUnderstanding {
  const original = query.replace(/\s+/g, " ").trim();
  const normalized = normalizeConcept(original);
  const requirements: VisualRequirement[] = [];
  const optional: VisualRequirement[] = [];
  const negatives: VisualRequirement[] = [];

  for (const entry of VISUAL_TAXONOMY) {
    const matched = entry.terms.some((term) => hasTerm(normalized, term));
    if (!matched) continue;

    const negated = entry.terms.some((term) => isNegated(normalized, term));
    const requirement = buildRequirement(entry, !negated);

    if (negated) {
      negatives.push({ ...requirement, required: false });
      continue;
    }

    if (entry.weight >= 3 || entry.category === "section" || entry.category === "component") {
      requirements.push(requirement);
    } else {
      optional.push({ ...requirement, required: false });
    }
  }

  const dedupe = (items: VisualRequirement[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.concept)) return false;
      seen.add(item.concept);
      return true;
    });
  };

  const dedupedRequirements = dedupe(requirements);
  const dedupedOptional = dedupe(optional).filter(
    (item) => !dedupedRequirements.some((required) => required.concept === item.concept)
  );
  const dedupedNegatives = dedupe(negatives);
  const allPositive = [...dedupedRequirements, ...dedupedOptional];

  return {
    original,
    normalized,
    requirements: dedupedRequirements,
    optional: dedupedOptional,
    negatives: dedupedNegatives,
    hasVisualConstraints: allPositive.length > 0 || dedupedNegatives.length > 0,
    targetSections: uniqueStrings(allPositive.filter((item) => item.category === "section").map((item) => item.concept)),
    mustHaveComponents: uniqueStrings(dedupedRequirements.filter((item) => item.category === "component").map((item) => item.concept)),
    styleConcepts: uniqueStrings(allPositive.filter((item) => item.category === "style").map((item) => item.concept)),
    colorConcepts: uniqueStrings(allPositive.filter((item) => item.category === "color").map((item) => item.concept)),
    contentConcepts: uniqueStrings(allPositive.filter((item) => item.category === "content").map((item) => item.concept)),
  };
}

