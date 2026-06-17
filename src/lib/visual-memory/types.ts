export type VisualMatchStrength = "exact" | "strong" | "possible" | "related" | "preparing";

export type VisualMatchLabel =
  | "Exact visual match"
  | "Strong visual match"
  | "Possible match"
  | "Related"
  | "Preparing memory";

export type VisualEvidenceSource =
  | "dom"
  | "css"
  | "aria"
  | "screenshot_cv"
  | "vision_model"
  | "heuristic"
  | "semantic"
  | "keyword";

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageFacts = {
  page_type:
    | "landing_page"
    | "homepage"
    | "pricing_page"
    | "dashboard"
    | "docs_page"
    | "blog_article"
    | "portfolio"
    | "ecommerce_page"
    | "checkout"
    | "onboarding"
    | "login"
    | "signup"
    | "settings"
    | "profile"
    | "gallery"
    | "case_study"
    | "changelog"
    | "status_page"
    | "search_results"
    | "unknown";
  industry?: string;
  category?: string;
  viewport_width?: number;
  viewport_height?: number;
  full_page_width?: number;
  full_page_height?: number;
  above_fold_height?: number;
  scroll_depth?: number;
  density?: "sparse" | "balanced" | "dense";
  visual_complexity?: "low" | "medium" | "high";
  color_mode?: "light" | "dark" | "mixed" | "monochrome" | "vibrant";
  device_target?: "desktop" | "mobile" | "tablet" | "responsive_unknown";
};

export type SectionFacts = {
  id: string;
  type:
    | "navbar"
    | "hero"
    | "logo_strip"
    | "social_proof"
    | "features"
    | "bento"
    | "pricing"
    | "testimonials"
    | "faq"
    | "footer"
    | "dashboard"
    | "table"
    | "form"
    | "gallery"
    | "article"
    | "docs_sidebar"
    | "product_demo"
    | "comparison"
    | "stats"
    | "cta"
    | "unknown";
  label: string;
  bbox?: BBox;
  viewport_zone?: "above_fold" | "near_fold" | "below_fold";
  order_index?: number;
  confidence: number;
  visible_text: string[];
  visible_brands: string[];
  components: string[];
  patterns: string[];
  colors: string[];
  typography: string[];
  evidence_phrases: string[];
};

export type ComponentFacts = Record<string, boolean | string[] | number | undefined>;

export type ColorFacts = {
  palette: string[];
  dominant_colors: string[];
  background_colors: string[];
  text_colors: string[];
  accent_colors: string[];
  border_colors: string[];
  gradient_present: boolean;
  gradient_type?: "linear" | "radial" | "mesh" | "conic" | "unknown";
  color_temperature?: "warm" | "cool" | "neutral" | "mixed";
  saturation?: "muted" | "balanced" | "vibrant";
  contrast?: "low" | "medium" | "high";
  color_mode?: "light" | "dark" | "mixed" | "monochrome";
};

export type TypographyFacts = {
  font_families: string[];
  heading_font?: string;
  body_font?: string;
  mono_font?: string;
  serif_present: boolean;
  sans_present: boolean;
  mono_present: boolean;
  display_type: boolean;
  oversized_heading: boolean;
  condensed_type: boolean;
  uppercase_labels: boolean;
  low_contrast_text: boolean;
  high_contrast_text: boolean;
  font_weights: string[];
  heading_sizes: string[];
  line_heights: string[];
  letter_spacing: string[];
  typographic_hierarchy?: "weak" | "normal" | "strong";
};

export type VisualEvidenceItem = {
  concept: string;
  label: string;
  source: VisualEvidenceSource;
  confidence: number;
  bbox?: BBox;
  matched_terms: string[];
  reason: string;
};

export type VisualFactsRoot = {
  version: number;
  page: PageFacts;
  sections: SectionFacts[];
  components: ComponentFacts;
  layout: Record<string, unknown>;
  colors: Partial<ColorFacts>;
  typography: Partial<TypographyFacts>;
  imagery: Record<string, unknown>;
  shapes: string[];
  surfaces: string[];
  motion: Record<string, unknown>;
  accessibility: Record<string, unknown>;
  content: Record<string, unknown>;
  patterns: string[];
  evidence: VisualEvidenceItem[];
  confidence: number;
};

export type VisualFactsRow = {
  id: string;
  user_id: string;
  bookmark_id: string;
  version: number;
  source: string;
  status: "pending" | "completed" | "failed";
  facts: Partial<VisualFactsRoot> | Record<string, unknown>;
  dom_snapshot: Record<string, unknown>;
  vision_snapshot: Record<string, unknown>;
  section_facts: SectionFacts[] | unknown[];
  visible_text: string[];
  visible_brands: string[];
  detected_components: string[];
  detected_patterns: string[];
  detected_styles: string[];
  detected_colors: string[];
  confidence: number;
  error: string | null;
  content_hash: string;
  created_at: string;
  updated_at: string;
};

export type VisualRequirement = {
  concept: string;
  label: string;
  terms: string[];
  weight: number;
  required: boolean;
  category: "section" | "component" | "pattern" | "style" | "color" | "content" | "layout";
};

export type QueryUnderstanding = {
  original: string;
  normalized: string;
  requirements: VisualRequirement[];
  optional: VisualRequirement[];
  negatives: VisualRequirement[];
  hasVisualConstraints: boolean;
  targetSections: string[];
  mustHaveComponents: string[];
  styleConcepts: string[];
  colorConcepts: string[];
  contentConcepts: string[];
};

export type VisualScoreBreakdown = {
  final: number;
  fact: number;
  lexical: number;
  vector: number;
  legacyVector: number;
  keyword: number;
  rerank: number;
};

export type VisualSearchEvidence = {
  concept: string;
  label: string;
  confidence: number;
  source: string;
  reason: string;
};

export type VisualSearchResultFields = {
  match_strength?: VisualMatchStrength;
  match_label?: VisualMatchLabel;
  matched_concepts?: string[];
  missing_concepts?: string[];
  visual_match_evidence?: VisualSearchEvidence[];
  visual_score_breakdown?: VisualScoreBreakdown;
};

