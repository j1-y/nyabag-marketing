import "server-only";

import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import { getDomain } from "@/lib/data";
import type { Bookmark } from "@/lib/types";
import { GEMINI_MODEL, getGeminiClient } from "./gemini";

const MAX_VISUAL_STYLE = 8;
const MAX_UI_PATTERNS = 12;
const MAX_COMPONENTS = 12;
const MAX_SUGGESTED_TAGS = 15;
const MAX_DESIGN_CONTEXT_CHARS = 240;

const GENERIC_DENYLIST = new Set([
  "website",
  "web",
  "business",
  "company",
  "brand",
  "platform",
  "service",
  "services",
  "online",
  "digital",
  "modern",
  "professional",
  "solution",
  "solutions",
  "product",
  "products",
  "customer",
  "customers",
  "user",
  "users",
  "marketing",
  "sales",
  "pricing",
  "price",
  "legal",
  "terms",
  "privacy",
  "about",
  "team",
  "career",
  "careers",
  "contact",
  "home",
  "homepage",
  "page",
  "site",
  "app",
  "application",
]);

const DESIGN_KEEP_HINTS = [
  "hero",
  "section",
  "layout",
  "grid",
  "card",
  "cards",
  "bento",
  "dashboard",
  "sidebar",
  "nav",
  "navigation",
  "menu",
  "command",
  "table",
  "form",
  "input",
  "search",
  "filter",
  "chips",
  "modal",
  "drawer",
  "toast",
  "empty",
  "state",
  "onboarding",
  "pricing",
  "comparison",
  "checkout",
  "profile",
  "settings",
  "landing",
  "portfolio",
  "editorial",
  "minimal",
  "brutalist",
  "dark",
  "light",
  "gradient",
  "monochrome",
  "typography",
  "type",
  "visual",
  "hierarchy",
  "contrast",
  "dense",
  "spacing",
  "split",
  "tabs",
  "accordion",
  "carousel",
  "feed",
  "gallery",
  "masonry",
  "inspector",
  "toolbar",
  "canvas",
  "workspace",
];

const PREFERRED_PAGE_TYPES = new Set([
  "saas-landing-page",
  "portfolio",
  "dashboard",
  "pricing-page",
  "design-inspiration-directory",
  "blog-article",
  "documentation",
  "ecommerce-page",
  "mobile-app-page",
  "checkout-flow",
  "onboarding-flow",
  "settings-page",
  "profile-page",
  "search-results-page",
  "gallery-page",
  "case-study-page",
  "unknown",
]);

const PREFERRED_FOLDERS = new Set([
  "Landing Pages",
  "Dashboards",
  "Pricing Pages",
  "Portfolios",
  "Mobile UI",
  "Forms",
  "Navigation",
  "Design Systems",
  "Ecommerce",
  "Onboarding",
  "Inspiration Boards",
  "Documentation",
  "Case Studies",
  "UI References",
]);

export const bookmarkAiOutputSchema = z.object({
  page_type: z.string().trim().max(80).default("unknown"),
  industry: z.string().trim().max(80).default("unknown"),
  visual_style: z.array(z.string().trim().max(80)).max(MAX_VISUAL_STYLE).default([]),
  ui_patterns: z.array(z.string().trim().max(80)).max(MAX_UI_PATTERNS).default([]),
  components: z.array(z.string().trim().max(80)).max(MAX_COMPONENTS).default([]),
  suggested_tags: z.array(z.string().trim().max(80)).max(MAX_SUGGESTED_TAGS).default([]),
  suggested_folder: z.string().trim().max(80).default(""),
  design_context: z.string().trim().max(MAX_DESIGN_CONTEXT_CHARS).default(""),
  confidence: z.coerce.number().min(0).max(1).default(0),
});

export type BookmarkAiOutput = z.infer<typeof bookmarkAiOutputSchema>;

export type BookmarkAiResult = BookmarkAiOutput & {
  model_name: string;
  raw_response: unknown;
};

const stringArraySchema = (maxItems: number): Schema => ({
  type: Type.ARRAY,
  maxItems: String(maxItems),
  items: { type: Type.STRING },
});

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    page_type: { type: Type.STRING, maxLength: "80" },
    industry: { type: Type.STRING, maxLength: "80" },
    visual_style: stringArraySchema(MAX_VISUAL_STYLE),
    ui_patterns: stringArraySchema(MAX_UI_PATTERNS),
    components: stringArraySchema(MAX_COMPONENTS),
    suggested_tags: stringArraySchema(MAX_SUGGESTED_TAGS),
    suggested_folder: { type: Type.STRING, maxLength: "80" },
    design_context: { type: Type.STRING, maxLength: String(MAX_DESIGN_CONTEXT_CHARS) },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: [
    "page_type",
    "industry",
    "visual_style",
    "ui_patterns",
    "components",
    "suggested_tags",
    "suggested_folder",
    "design_context",
    "confidence",
  ],
  propertyOrdering: [
    "page_type",
    "industry",
    "visual_style",
    "ui_patterns",
    "components",
    "suggested_tags",
    "suggested_folder",
    "design_context",
    "confidence",
  ],
};

function toKebabCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/ui\/ux/g, "ui-ux")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCaseFolder(value: string) {
  const cleaned = value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "ui") return "UI";
      if (lower === "ux") return "UX";
      if (lower === "saas") return "SaaS";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function isGenericOnly(value: string) {
  const token = toKebabCase(value);
  if (!token) return true;

  if (GENERIC_DENYLIST.has(token)) return true;

  const parts = token.split("-");
  return parts.every((part) => GENERIC_DENYLIST.has(part));
}

function hasDesignSignal(value: string) {
  const token = toKebabCase(value);
  if (!token) return false;

  if (PREFERRED_PAGE_TYPES.has(token)) return true;

  return DESIGN_KEEP_HINTS.some((hint) => token.includes(hint));
}

function normalizeArray(values: string[], limit: number, options?: {
  requireDesignSignal?: boolean;
}) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const next = toKebabCase(value);

    if (!next || seen.has(next)) continue;
    if (isGenericOnly(next)) continue;

    if (options?.requireDesignSignal && !hasDesignSignal(next)) {
      continue;
    }

    seen.add(next);
    normalized.push(next);

    if (normalized.length >= limit) break;
  }

  return normalized;
}

function normalizePageType(value: string) {
  const pageType = toKebabCase(value);

  if (!pageType || isGenericOnly(pageType)) return "unknown";

  if (PREFERRED_PAGE_TYPES.has(pageType)) return pageType;

  if (hasDesignSignal(pageType)) return pageType.slice(0, 80);

  return "unknown";
}

function normalizeIndustry(value: string) {
  const industry = toKebabCase(value);

  if (!industry || isGenericOnly(industry)) return "unknown";

  // Keep this broad and product/design-oriented. This field should not become a business description.
  return industry.slice(0, 80);
}

function normalizeSuggestedFolder(value: string, pageType: string, tags: string[]) {
  const folder = toTitleCaseFolder(value);

  if (folder && PREFERRED_FOLDERS.has(folder)) return folder;

  if (pageType.includes("dashboard")) return "Dashboards";
  if (pageType.includes("pricing")) return "Pricing Pages";
  if (pageType.includes("portfolio")) return "Portfolios";
  if (pageType.includes("mobile") || tags.some((tag) => tag.includes("mobile"))) return "Mobile UI";
  if (pageType.includes("onboarding")) return "Onboarding";
  if (pageType.includes("documentation")) return "Documentation";
  if (pageType.includes("ecommerce") || pageType.includes("checkout")) return "Ecommerce";
  if (pageType.includes("case-study")) return "Case Studies";
  if (pageType.includes("landing")) return "Landing Pages";
  if (tags.some((tag) => tag.includes("form") || tag.includes("input"))) return "Forms";
  if (tags.some((tag) => tag.includes("nav") || tag.includes("menu"))) return "Navigation";
  if (tags.some((tag) => tag.includes("design-system"))) return "Design Systems";

  return folder || "UI References";
}

function cleanDesignContext(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(this|the)\s+(website|company|platform|service)\s+/i, "This reference ")
    .slice(0, MAX_DESIGN_CONTEXT_CHARS);
}

function normalizeOutput(output: BookmarkAiOutput): BookmarkAiOutput {
  const pageType = normalizePageType(output.page_type);
  const visualStyle = normalizeArray(output.visual_style, MAX_VISUAL_STYLE, {
    requireDesignSignal: false,
  });
  const uiPatterns = normalizeArray(output.ui_patterns, MAX_UI_PATTERNS, {
    requireDesignSignal: true,
  });
  const components = normalizeArray(output.components, MAX_COMPONENTS, {
    requireDesignSignal: true,
  });
  const suggestedTags = normalizeArray(output.suggested_tags, MAX_SUGGESTED_TAGS, {
    requireDesignSignal: true,
  });

  return {
    page_type: pageType,
    industry: normalizeIndustry(output.industry),
    visual_style: visualStyle,
    ui_patterns: uiPatterns,
    components,
    suggested_tags: suggestedTags,
    suggested_folder: normalizeSuggestedFolder(output.suggested_folder, pageType, suggestedTags),
    design_context: cleanDesignContext(output.design_context),
    confidence: Math.min(1, Math.max(0, output.confidence)),
  };
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(unfenced) as unknown;
}

function buildPrompt(bookmark: Bookmark) {
  const input = {
    url: bookmark.url,
    domain: getDomain(bookmark.url),
    title: bookmark.title,
    summary: bookmark.summary,
    note: bookmark.note,
    existing_tags: bookmark.tags,
    palette: bookmark.palette,
    fonts: bookmark.fonts,
  };

  return `You are Nyabag's design-memory intelligence layer.

Nyabag is a personal second memory for design.
Analyze this saved reference only from a product/UI designer's perspective.

Your only job:
Return design-specific metadata that helps a designer find, compare, and reuse this reference later.

Focus strictly on:
- product design
- UI layout
- page structure
- visual hierarchy
- interaction patterns
- reusable UI components
- navigation patterns
- content density
- visual style
- design retrieval tags

Ignore:
- company history
- business model
- pricing details
- marketing claims
- legal text
- SEO copy
- founder/team information
- sales messaging
- general website description
- product features unless they affect UI/UX structure

Do not describe what the company does unless it helps classify the interface pattern.

Input data:
${JSON.stringify(input, null, 2)}

Return this exact compact JSON shape:
{
  "page_type": "saas-landing-page",
  "industry": "design-tools",
  "visual_style": ["dark-ui", "minimal", "high-contrast"],
  "ui_patterns": ["hero-section", "filter-bar", "card-grid"],
  "components": ["navbar", "search-input", "filter-chips", "cards", "cta"],
  "suggested_tags": ["design-inspiration", "card-grid", "dark-ui", "filter-ui"],
  "suggested_folder": "UI References",
  "design_context": "Useful for studying dark inspiration-directory layouts, filter-based browsing, and compact visual card grids.",
  "confidence": 0.86
}

Field rules:
- page_type must describe the interface/page pattern, not the business.
- industry must be a broad product/design category, not a company description.
- visual_style must describe look and feel.
- ui_patterns must describe layout or UX patterns.
- components must describe visible UI components.
- suggested_tags must be retrieval-focused design tags.
- suggested_folder must be a simple designer-friendly folder name.
- design_context must explain why this reference is useful for design memory.

Allowed page_type examples:
saas-landing-page, portfolio, dashboard, pricing-page, design-inspiration-directory, blog-article, documentation, ecommerce-page, mobile-app-page, checkout-flow, onboarding-flow, settings-page, profile-page, search-results-page, gallery-page, case-study-page, unknown

Preferred visual_style examples:
minimal, dark-ui, light-ui, high-contrast, editorial, playful, brutalist, monochrome, gradient-heavy, glassmorphism, dense-layout, spacious-layout, soft-ui, bold-typography, muted-colors, vibrant-colors

Preferred ui_patterns examples:
hero-section, pricing-cards, bento-grid, sidebar-nav, card-grid, dashboard-ui, split-layout, filter-bar, search-ui, onboarding-flow, empty-state, comparison-table, testimonial-section, form-layout, command-menu, data-table, mobile-nav, masonry-grid, tabbed-navigation, feature-grid, sticky-header, inspector-panel

Preferred components examples:
navbar, sidebar, cards, cta, search-input, filter-chips, tabs, table, form, modal, drawer, accordion, dropdown, command-menu, breadcrumbs, pagination, avatar, badge, tooltip, toast, chart, gallery, footer, input-field

Avoid generic values:
website, business, company, platform, service, online, digital, modern, professional, solution, product, customer, marketing, sales, pricing-details, legal, about-page, home-page

Every suggested tag must answer:
"Would a designer search this term to find this reference later?"

If a value is not clearly inferable from the provided metadata, use "unknown" or an empty array instead of guessing.

Style constraints:
- Use short design vocabulary.
- Prefer 1-3 word values.
- Use kebab-case for all array values.
- Keep design_context under ${MAX_DESIGN_CONTEXT_CHARS} characters.
- Do not include markdown.
- Do not include explanations.
- Do not include extra keys.
- Return compact JSON only.`;
}

export async function enrichBookmarkDesignMetadata(bookmark: Bookmark): Promise<BookmarkAiResult> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildPrompt(bookmark),
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.1,
      topP: 0.85,
      topK: 24,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const raw = parseJson(text);
  const parsed = bookmarkAiOutputSchema.parse(raw);
  const normalized = bookmarkAiOutputSchema.parse(normalizeOutput(parsed));

  return {
    ...normalized,
    model_name: response.modelVersion || GEMINI_MODEL,
    raw_response: raw,
  };
}