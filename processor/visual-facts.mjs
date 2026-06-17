import crypto from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const GEMINI_MODEL = process.env.VISUAL_FACTS_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const MAX_TEXT_ITEMS = 120;
const MAX_BRANDS = 60;
const MAX_FACT_ITEMS = 80;

let geminiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

export function isVisualFactsGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toToken(value) {
  return clean(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unique(values, limit = MAX_FACT_ITEMS) {
  const seen = new Set();
  const result = [];
  for (const value of values ?? []) {
    const text = clean(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function luminanceFromRgb(rgb) {
  const match = clean(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inferColorMode(backgrounds, palette) {
  const luminances = [...(backgrounds ?? []), ...(palette ?? [])]
    .map((entry) => luminanceFromRgb(entry.value ?? entry))
    .filter((value) => typeof value === "number");
  if (!luminances.length) return "mixed";
  const average = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  if (average < 90) return "dark";
  if (average > 180) return "light";
  return "mixed";
}

function addEvidence(evidence, concept, label, source, confidence, reason, matchedTerms = [], bbox) {
  evidence.push({
    concept,
    label,
    source,
    confidence,
    reason,
    matched_terms: matchedTerms,
    ...(bbox ? { bbox } : {}),
  });
}

function buildFactsFromSnapshot(snapshot) {
  const elements = snapshot.elements ?? [];
  const sections = snapshot.sections ?? [];
  const text = unique(elements.map((el) => el.text).filter((item) => item && item.length > 1), MAX_TEXT_ITEMS);
  const placeholders = unique(elements.map((el) => el.placeholder).filter(Boolean), 40);
  const imageAlts = unique(elements.map((el) => el.alt).filter(Boolean), 80);
  const evidence = [];
  const detectedComponents = new Set();
  const detectedPatterns = new Set();
  const detectedStyles = new Set();
  const detectedColors = new Set();
  const visibleBrands = new Set();

  const allText = `${text.join(" ")} ${placeholders.join(" ")} ${imageAlts.join(" ")}`.toLowerCase();
  const aboveFold = elements.filter((el) => el.rect?.top < snapshot.viewport.height * 1.2);
  const headings = elements.filter((el) => /^h[1-6]$/.test(el.tag) || el.role === "heading");
  const buttons = elements.filter((el) => el.tag === "button" || el.role === "button");
  const inputs = elements.filter((el) => ["input", "textarea", "select"].includes(el.tag) || el.role === "searchbox");
  const images = elements.filter((el) => ["img", "svg", "picture", "video"].includes(el.tag));
  const navs = elements.filter((el) => el.tag === "nav" || el.role === "navigation" || /nav|navbar|header/.test(el.className));
  const cards = elements.filter((el) => /card|tile|panel|pricing|feature|testimonial|metric|stat/.test(el.className) || Number(el.borderRadiusPx ?? 0) >= 10 || Boolean(el.boxShadow));
  const grids = elements.filter((el) => /grid/.test(el.display) || /grid|bento/.test(el.className));
  const searchInputs = inputs.filter((el) =>
    el.type === "search" ||
    el.role === "searchbox" ||
    /search|find|ask|query|paste|url|domain|company/.test(`${el.placeholder} ${el.ariaLabel} ${el.text}`.toLowerCase())
  );
  const logoCandidates = images.filter((el) =>
    el.rect?.width <= 220 &&
    el.rect?.height <= 90 &&
    (el.alt || /logo|brand|customer|partner/.test(el.className))
  );

  for (const alt of imageAlts) {
    if (/logo|brand|customer|partner/i.test(alt)) {
      visibleBrands.add(alt.replace(/\blogo\b/gi, "").trim());
    }
  }

  if (navs.length) {
    detectedComponents.add("navbar");
    addEvidence(evidence, "navbar", "Navbar", "dom", 0.85, "Top navigation element or navigation role is visible.", ["nav", "navigation"], navs[0].bbox);
  }

  const heroHeading = headings
    .filter((el) => el.rect?.top < snapshot.viewport.height * 0.95)
    .sort((a, b) => Number.parseFloat(b.fontSize || "0") - Number.parseFloat(a.fontSize || "0"))[0];
  if (heroHeading || aboveFold.length > 12) {
    detectedComponents.add("hero");
    detectedPatterns.add("hero_section");
    addEvidence(evidence, "hero", "Hero", "heuristic", heroHeading ? 0.86 : 0.62, "A prominent above-fold section with heading/content was detected.", ["hero", "above_fold"], heroHeading?.bbox);
  }

  if (searchInputs.length) {
    detectedComponents.add("search_bar");
    if (searchInputs.some((el) => el.rect?.top < snapshot.viewport.height * 1.15)) detectedComponents.add("search_bar_in_hero");
    addEvidence(evidence, "search_bar", "Search bar", "dom", 0.9, "Visible search/input field with search-like type, role, or placeholder.", ["search", "input"], searchInputs[0].bbox);
  }

  if (logoCandidates.length >= 3 || /\b(trusted by|used by|loved by|customers|partners|teams at)\b/.test(allText)) {
    detectedComponents.add("logo_strip");
    detectedComponents.add("customer_logo_strip");
    detectedPatterns.add("social_proof");
    addEvidence(evidence, "logo_strip", "Logo strip", "heuristic", 0.82, "Repeated small logo-like images or social-proof copy are visible.", ["logos", "trusted by", "customers"], logoCandidates[0]?.bbox);
  }

  if (cards.length >= 4) {
    detectedComponents.add("card");
    detectedPatterns.add("card_grid");
    addEvidence(evidence, "cards", "Cards", "heuristic", 0.72, "Multiple repeated bordered, shadowed, rounded, or card-like modules are visible.", ["card", "grid"]);
  }

  if (grids.some((el) => /bento/.test(el.className)) || (grids.length && cards.length >= 5)) {
    detectedPatterns.add("bento_grid");
    addEvidence(evidence, "bento_grid", "Bento grid", "heuristic", 0.68, "Grid/card modules suggest a bento or modular layout.", ["bento", "grid"]);
  }

  if (buttons.length) detectedComponents.add("button");
  if (inputs.length) detectedComponents.add("input_field");
  if (snapshot.counts.forms > 0) detectedComponents.add("form");
  if (snapshot.counts.tables > 0) detectedComponents.add("table");
  if (snapshot.counts.asides > 0 || elements.some((el) => /sidebar|side-nav|sidenav/.test(el.className))) detectedComponents.add("sidebar");
  if (elements.some((el) => /metric|stat|kpi|analytics/.test(`${el.className} ${el.text}`.toLowerCase()))) detectedComponents.add("metric_card");
  if (elements.some((el) => /monthly|yearly|annual|toggle|switch|segmented/.test(`${el.className} ${el.text} ${el.role}`.toLowerCase()))) detectedComponents.add("toggle");
  if (elements.some((el) => /filter/.test(`${el.className} ${el.text}`.toLowerCase()))) detectedComponents.add("filters");
  if (elements.some((el) => /mockup|screenshot|browser|phone|laptop|demo/.test(`${el.className} ${el.alt} ${el.text}`.toLowerCase()))) detectedComponents.add("product_mockup");

  const colorMode = inferColorMode(snapshot.colors?.backgrounds, snapshot.screenshotPalette);
  detectedColors.add(colorMode === "dark" ? "dark_ui" : colorMode === "light" ? "light_ui" : "mixed_ui");
  if (snapshot.colors?.gradients?.length) {
    detectedStyles.add("gradient");
    detectedColors.add("gradient");
  }
  if (elements.some((el) => Number(el.borderRadiusPx ?? 0) >= 999 || /pill|badge|chip/.test(el.className))) detectedComponents.add("pill_button");
  if (elements.some((el) => /serif/i.test(el.fontFamily))) detectedStyles.add("serif_typography");
  if (elements.some((el) => /mono|code|consolas|menlo/i.test(el.fontFamily))) detectedStyles.add("mono_typography");
  if (cards.length && cards.every((el) => Number(el.borderRadiusPx ?? 0) >= 10)) detectedStyles.add("rounded_cards");

  const sectionFacts = sections.map((section, index) => {
    const sectionText = `${section.text} ${section.className}`.toLowerCase();
    let type = section.type;
    if (index === 0 && (type === "unknown" || section.rect?.top < snapshot.viewport.height * 0.7)) type = "hero";
    if (/pricing|plans|monthly|yearly/.test(sectionText)) type = "pricing";
    if (/footer/.test(sectionText) || section.tag === "footer") type = "footer";
    if (/logo|trusted by|used by|partners|customers/.test(sectionText)) type = "logo_strip";
    if (/dashboard|metric|analytics|chart/.test(sectionText)) type = "dashboard";
    if (/table|filter/.test(sectionText)) type = "table";
    if (/form|input|search/.test(sectionText)) type = type === "hero" ? "hero" : "form";

    const components = [];
    if (type === "hero") components.push("hero");
    if (/search|input/.test(sectionText)) components.push("search_bar");
    if (/logo|trusted|partners|customers/.test(sectionText)) components.push("logo_strip");
    if (/card|pricing|plan|feature|metric/.test(sectionText)) components.push("card");

    return {
      id: `section-${index + 1}`,
      type,
      label: section.label || type,
      bbox: section.bbox,
      viewport_zone: section.rect?.top < snapshot.viewport.height ? "above_fold" : section.rect?.top < snapshot.viewport.height * 1.5 ? "near_fold" : "below_fold",
      order_index: index,
      confidence: type === "unknown" ? 0.45 : 0.7,
      visible_text: unique([section.text], 8),
      visible_brands: [],
      components: unique(components, 10),
      patterns: type === "logo_strip" ? ["social_proof"] : [],
      colors: [],
      typography: [],
      evidence_phrases: unique([section.text], 5),
    };
  });

  return {
    version: 1,
    page: {
      page_type: detectedComponents.has("dashboard") ? "dashboard" : detectedComponents.has("toggle") && /pricing|plans/.test(allText) ? "pricing_page" : "landing_page",
      viewport_width: snapshot.viewport.width,
      viewport_height: snapshot.viewport.height,
      full_page_width: snapshot.page.width,
      full_page_height: snapshot.page.height,
      above_fold_height: snapshot.viewport.height,
      scroll_depth: snapshot.page.height,
      density: elements.length > 850 ? "dense" : elements.length > 350 ? "balanced" : "sparse",
      visual_complexity: cards.length > 10 || images.length > 20 ? "high" : cards.length > 4 || images.length > 8 ? "medium" : "low",
      color_mode: colorMode,
      device_target: snapshot.viewport.width < 700 ? "mobile" : snapshot.viewport.width < 1024 ? "tablet" : "desktop",
    },
    sections: sectionFacts,
    components: Object.fromEntries([...detectedComponents].map((key) => [key, true])),
    layout: {
      counts: snapshot.counts,
      has_grid: grids.length > 0,
      has_cards: cards.length > 0,
    },
    colors: {
      palette: snapshot.screenshotPalette ?? [],
      dominant_colors: snapshot.screenshotPalette ?? [],
      background_colors: unique(snapshot.colors?.backgrounds?.map((entry) => entry.value), 12),
      text_colors: unique(snapshot.colors?.textColors?.map((entry) => entry.value), 12),
      accent_colors: snapshot.screenshotPalette ?? [],
      border_colors: unique(snapshot.colors?.borderColors?.map((entry) => entry.value), 12),
      gradient_present: Boolean(snapshot.colors?.gradients?.length),
      color_mode: colorMode,
    },
    typography: {
      font_families: unique(snapshot.typography?.fonts?.map((entry) => entry.value), 12),
      serif_present: detectedStyles.has("serif_typography"),
      sans_present: true,
      mono_present: detectedStyles.has("mono_typography"),
      display_type: Boolean(heroHeading && Number.parseFloat(heroHeading.fontSize || "0") >= 44),
      oversized_heading: Boolean(heroHeading && Number.parseFloat(heroHeading.fontSize || "0") >= 56),
      condensed_type: false,
      uppercase_labels: elements.some((el) => el.textTransform === "uppercase"),
      low_contrast_text: false,
      high_contrast_text: false,
      font_weights: unique(elements.map((el) => el.fontWeight), 10),
      heading_sizes: unique(headings.map((el) => el.fontSize), 10),
      line_heights: unique(elements.map((el) => el.lineHeight), 10),
      letter_spacing: unique(elements.map((el) => el.letterSpacing), 10),
    },
    imagery: {
      image_count: images.length,
      screenshot_based: detectedComponents.has("product_mockup"),
      hero_visual_type: detectedComponents.has("product_mockup") ? "product_ui_preview" : images.length ? "image" : "none",
    },
    shapes: detectedComponents.has("pill_button") ? ["pill", "rounded_rectangle"] : cards.length ? ["rounded_rectangle"] : [],
    surfaces: cards.length ? ["elevated", "bordered"] : ["flat"],
    motion: {},
    accessibility: {
      roles: unique(elements.map((el) => el.role).filter(Boolean), 30),
      focusable_count: snapshot.counts.focusable,
      buttons_count: snapshot.counts.buttons,
      links_count: snapshot.counts.links,
      inputs_count: snapshot.counts.inputs,
      headings_count_by_level: snapshot.counts.headingsByLevel,
      image_alt_texts: imageAlts,
    },
    content: {
      visible_text: text,
      headings: unique(headings.map((el) => el.text), 20),
      cta_labels: unique(buttons.map((el) => el.text), 20),
      input_placeholders: placeholders,
      logo_names: unique([...visibleBrands], MAX_BRANDS),
      brand_names: unique([...visibleBrands], MAX_BRANDS),
    },
    patterns: unique([...detectedPatterns]),
    evidence,
    confidence: evidence.length ? Math.min(0.92, 0.48 + evidence.length * 0.055) : 0.45,
  };
}

export async function extractVisualFacts(page, url, screenshotPalette = []) {
  const snapshot = await page.evaluate(() => {
    const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const numberPx = (value) => Number.parseFloat(String(value || "0").replace("px", "")) || 0;
    const viewportHeight = window.innerHeight || 900;
    const viewportWidth = window.innerWidth || 1200;
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 2 &&
        rect.height > 2 &&
        rect.bottom > -viewportHeight * 0.25 &&
        rect.top < viewportHeight * 6 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0.05 &&
        !["script", "style", "meta", "link", "noscript"].includes(element.tagName.toLowerCase())
      );
    };
    const rectFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    };
    const bboxFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const addCount = (map, value) => {
      const next = cleanText(value);
      if (!next || next === "rgba(0, 0, 0, 0)") return;
      map.set(next, (map.get(next) ?? 0) + 1);
    };
    const topEntries = (map, limit) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([value, count]) => ({ value, count }));

    const elements = Array.from(document.querySelectorAll("body *")).filter(isVisible).slice(0, 1200);
    const fontCounts = new Map();
    const textColors = new Map();
    const backgrounds = new Map();
    const borderColors = new Map();
    const gradients = [];
    const serialized = [];
    const headingsByLevel = {};

    for (const element of elements) {
      const style = getComputedStyle(element);
      const tag = element.tagName.toLowerCase();
      const rect = rectFor(element);
      const className = typeof element.className === "string" ? element.className : "";
      const text = cleanText(element.innerText || element.textContent).slice(0, 160);
      const role = element.getAttribute("role") || "";
      const ariaLabel = element.getAttribute("aria-label") || "";
      const title = element.getAttribute("title") || "";
      const alt = element.getAttribute("alt") || "";
      const placeholder = element.getAttribute("placeholder") || "";

      addCount(fontCounts, style.fontFamily);
      addCount(textColors, style.color);
      addCount(backgrounds, style.backgroundColor);
      if (style.borderStyle !== "none") addCount(borderColors, style.borderColor);
      if (style.backgroundImage && style.backgroundImage !== "none" && /gradient/i.test(style.backgroundImage)) {
        gradients.push(style.backgroundImage.slice(0, 120));
      }
      if (/^h[1-6]$/.test(tag)) headingsByLevel[tag] = (headingsByLevel[tag] ?? 0) + 1;

      serialized.push({
        tag,
        role,
        ariaLabel: cleanText(ariaLabel).slice(0, 120),
        title: cleanText(title).slice(0, 120),
        alt: cleanText(alt).slice(0, 120),
        placeholder: cleanText(placeholder).slice(0, 120),
        type: element.getAttribute("type") || "",
        className: cleanText(className).slice(0, 140).toLowerCase(),
        id: cleanText(element.id).slice(0, 80).toLowerCase(),
        rect,
        bbox: bboxFor(element),
        viewportZone: rect.top < viewportHeight ? "above_fold" : rect.top < viewportHeight * 1.5 ? "near_fold" : "below_fold",
        text,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderRadiusPx: numberPx(style.borderRadius),
        boxShadow: style.boxShadow && style.boxShadow !== "none" ? style.boxShadow.slice(0, 120) : "",
        display: style.display,
        position: style.position,
        zIndex: style.zIndex,
        opacity: style.opacity,
        gridTemplateColumns: style.gridTemplateColumns,
        gridTemplateRows: style.gridTemplateRows,
        gap: style.gap,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
        parent: element.parentElement
          ? {
              tag: element.parentElement.tagName.toLowerCase(),
              className: cleanText(typeof element.parentElement.className === "string" ? element.parentElement.className : "").slice(0, 80).toLowerCase(),
            }
          : null,
      });
    }

    const sectionElements = Array.from(document.querySelectorAll("header, nav, main, section, article, footer, aside, form, [role='region'], [class*='hero'], [class*='section'], [class*='pricing'], [class*='footer'], [class*='dashboard'], [class*='bento']"))
      .filter(isVisible)
      .slice(0, 80);

    const sections = sectionElements.map((element) => {
      const tag = element.tagName.toLowerCase();
      const className = cleanText(typeof element.className === "string" ? element.className : "").slice(0, 140).toLowerCase();
      const role = element.getAttribute("role") || "";
      let type = "unknown";
      if (tag === "nav" || role === "navigation" || /nav/.test(className)) type = "navbar";
      else if (tag === "footer" || /footer/.test(className)) type = "footer";
      else if (/hero/.test(className)) type = "hero";
      else if (/pricing|plans/.test(className)) type = "pricing";
      else if (/bento/.test(className)) type = "bento";
      else if (/dashboard|analytics/.test(className)) type = "dashboard";
      else if (tag === "form") type = "form";
      return {
        tag,
        role,
        type,
        label: cleanText(element.getAttribute("aria-label") || element.id || className.split(" ")[0] || tag).slice(0, 80),
        className,
        rect: rectFor(element),
        bbox: bboxFor(element),
        text: cleanText(element.innerText || element.textContent).slice(0, 220),
      };
    });

    return {
      url: window.location.href,
      title: document.title,
      viewport: { width: viewportWidth, height: viewportHeight },
      page: {
        width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
        height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
      },
      counts: {
        elements: serialized.length,
        headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
        headingsByLevel,
        buttons: document.querySelectorAll("button,[role='button']").length,
        links: document.querySelectorAll("a[href]").length,
        inputs: document.querySelectorAll("input,textarea,select,[role='searchbox']").length,
        forms: document.querySelectorAll("form,input,textarea,select").length,
        tables: document.querySelectorAll("table,[role='table'],[role='grid']").length,
        asides: document.querySelectorAll("aside,[class*='sidebar'],[class*='sidenav']").length,
        focusable: document.querySelectorAll("a[href],button,input,textarea,select,[tabindex]").length,
        media: document.querySelectorAll("img,svg,picture,video,canvas").length,
      },
      colors: {
        textColors: topEntries(textColors, 16),
        backgrounds: topEntries(backgrounds, 16),
        borderColors: topEntries(borderColors, 16),
        gradients: [...new Set(gradients)].slice(0, 16),
      },
      typography: {
        fonts: topEntries(fontCounts, 16),
      },
      elements: serialized,
      sections,
    };
  });

  snapshot.requestedUrl = url;
  snapshot.screenshotPalette = screenshotPalette;
  const facts = buildFactsFromSnapshot(snapshot);
  return { facts, snapshot };
}

const aiFactsSchema = z.object({
  detected_components: z.array(z.string()).max(40).default([]),
  detected_patterns: z.array(z.string()).max(40).default([]),
  detected_styles: z.array(z.string()).max(30).default([]),
  detected_colors: z.array(z.string()).max(30).default([]),
  visible_brands: z.array(z.string()).max(30).default([]),
  evidence: z.array(z.object({
    concept: z.string(),
    label: z.string(),
    reason: z.string(),
    confidence: z.coerce.number().min(0).max(1).default(0.5),
  })).max(20).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

const aiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    detected_components: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "40" },
    detected_patterns: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "40" },
    detected_styles: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "30" },
    detected_colors: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "30" },
    visible_brands: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "30" },
    evidence: {
      type: Type.ARRAY,
      maxItems: "20",
      items: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING },
          label: { type: Type.STRING },
          reason: { type: Type.STRING },
          confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
        },
        required: ["concept", "label", "reason", "confidence"],
      },
    },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ["detected_components", "detected_patterns", "detected_styles", "detected_colors", "visible_brands", "evidence", "confidence"],
};

function parseJson(text) {
  return JSON.parse(clean(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
}

export async function enrichVisualFactsWithAi({ bookmark, screenshot, deterministic }) {
  if (!isVisualFactsGeminiConfigured()) return null;
  const prompt = `You verify screenshot-visible UI facts for a designer's visual memory search.

Use the screenshot as source of truth. DOM facts are supporting evidence only.
Return concise kebab-case concepts for visible sections, components, patterns, styles, colors, and brand/logo names.
Do not infer a component if it is not visible. Be especially strict for hero, search bar, customer/company logos, pricing toggle, dashboard/sidebar, table/filter, bento grid, and product mockup.

Bookmark:
${JSON.stringify({ title: bookmark.title, url: bookmark.url, summary: bookmark.summary })}

Deterministic facts:
${JSON.stringify({
  page: deterministic.facts.page,
  components: deterministic.facts.components,
  patterns: deterministic.facts.patterns,
  colors: deterministic.facts.colors,
  typography: deterministic.facts.typography,
  content: deterministic.facts.content,
}).slice(0, 12000)}

Return JSON only.`;

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/webp", data: screenshot.toString("base64") } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: aiResponseSchema,
      temperature: 0.05,
      topP: 0.8,
      topK: 16,
    },
  });

  const parsed = aiFactsSchema.parse(parseJson(response.text));
  return {
    ...parsed,
    model: response.modelVersion || GEMINI_MODEL,
  };
}

export function mergeVisualFacts(deterministic, aiFacts) {
  const facts = structuredClone(deterministic.facts);
  const aiComponents = unique(aiFacts?.detected_components?.map(toToken) ?? []);
  const aiPatterns = unique(aiFacts?.detected_patterns?.map(toToken) ?? []);
  const aiStyles = unique(aiFacts?.detected_styles?.map(toToken) ?? []);
  const aiColors = unique(aiFacts?.detected_colors?.map(toToken) ?? []);
  const visibleBrands = unique([
    ...(facts.content?.brand_names ?? []),
    ...(aiFacts?.visible_brands ?? []),
  ], MAX_BRANDS);

  for (const component of aiComponents) facts.components[component] = true;
  facts.patterns = unique([...(facts.patterns ?? []), ...aiPatterns]);
  facts.shapes = unique(facts.shapes ?? []);
  facts.surfaces = unique(facts.surfaces ?? []);
  facts.evidence = [
    ...(facts.evidence ?? []),
    ...(aiFacts?.evidence ?? []).map((item) => ({
      concept: toToken(item.concept),
      label: item.label,
      source: "vision_model",
      confidence: item.confidence,
      reason: item.reason,
      matched_terms: [item.concept],
    })),
  ].slice(0, 80);
  facts.content = {
    ...(facts.content ?? {}),
    visible_brands: visibleBrands,
    logo_names: visibleBrands,
    brand_names: visibleBrands,
  };
  facts.confidence = Math.max(Number(facts.confidence ?? 0), Number(aiFacts?.confidence ?? 0));

  return {
    facts,
    detected_components: unique([...Object.keys(facts.components ?? {}), ...aiComponents]),
    detected_patterns: unique([...(facts.patterns ?? []), ...aiPatterns]),
    detected_styles: unique([...(facts.typography?.serif_present ? ["serif_typography"] : []), ...aiStyles]),
    detected_colors: unique([...(facts.colors?.palette ?? []), facts.colors?.color_mode, ...aiColors].filter(Boolean)),
    visible_text: unique(facts.content?.visible_text ?? [], MAX_TEXT_ITEMS),
    visible_brands: visibleBrands,
    section_facts: facts.sections ?? [],
    confidence: facts.confidence,
  };
}

export async function upsertVisualFacts(supabase, job, merged, snapshot, aiFacts, error = null) {
  const payloadText = JSON.stringify({
    facts: merged?.facts ?? {},
    snapshot,
    aiFacts,
  });
  const contentHash = crypto.createHash("sha256").update(payloadText).digest("hex");

  const { data, error: upsertError } = await supabase
    .from("bookmark_visual_facts")
    .upsert(
      {
        user_id: job.user_id,
        bookmark_id: job.bookmark_id,
        version: 1,
        source: aiFacts ? "processor+vision" : "processor",
        status: error ? "failed" : "completed",
        facts: merged?.facts ?? {},
        dom_snapshot: snapshot ?? {},
        vision_snapshot: aiFacts ?? {},
        section_facts: merged?.section_facts ?? [],
        visible_text: merged?.visible_text ?? [],
        visible_brands: merged?.visible_brands ?? [],
        detected_components: merged?.detected_components ?? [],
        detected_patterns: merged?.detected_patterns ?? [],
        detected_styles: merged?.detected_styles ?? [],
        detected_colors: merged?.detected_colors ?? [],
        confidence: Math.min(1, Math.max(0, Number(merged?.confidence ?? 0))),
        error: error ? clean(error).slice(0, 1000) : null,
        content_hash: contentHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bookmark_id" }
    )
    .select()
    .single();

  if (upsertError) throw new Error(`Could not save visual facts: ${upsertError.message}`);
  return data;
}

