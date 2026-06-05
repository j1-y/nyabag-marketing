import * as cheerio from "cheerio";
import postcss, { type Declaration, type Rule } from "postcss";
import safeParser from "postcss-safe-parser";
import { formatHex, formatRgb, parse as parseColor } from "culori";
import { getDesignDnaColorName } from "./color-names";
import type { DesignDnaColorItem, DesignDnaTypographyItem } from "@/lib/types";

const HTML_TIMEOUT_MS = 10_000;
const CSS_TIMEOUT_MS = 8_000;
const MAX_STYLESHEETS = 12;
const MAX_TOTAL_CSS_BYTES = 1_500_000;
const MAX_TEXT_SAMPLE_LENGTH = 120;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; NyabagDesignDNA/1.0; +https://nyabag.app)",
  Accept: "text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.5",
};

type TypographyCandidate = Partial<DesignDnaTypographyItem> & {
  selector: string;
  declarations: Record<string, string>;
};

type ColorCandidate = {
  hex: string;
  rgb?: string;
  usage: string;
  source: DesignDnaColorItem["source"];
  variableName?: string;
  count: number;
};

export type ExtractedDesignDna = {
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceTitle: string;
  screenshotUrl?: string | null;
  typography: DesignDnaTypographyItem[];
  colors: DesignDnaColorItem[];
  components: string[];
  layoutPatterns: string[];
  rawExtraction: Record<string, unknown>;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function compactText(value: string | undefined | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function trimSample(value: string) {
  const text = compactText(value);
  return text.length > MAX_TEXT_SAMPLE_LENGTH ? `${text.slice(0, MAX_TEXT_SAMPLE_LENGTH - 1)}...` : text;
}

function getHostname(url: URL) {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

function isPrivateIp(hostname: string) {
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^0\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  const private172 = hostname.match(/^172\.(\d+)\./);
  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (/^169\.254\./.test(hostname)) return true;
  if (hostname === "::1" || hostname === "[::1]") return true;
  if (/^fc|^fd|^fe80/i.test(hostname)) return true;
  return false;
}

function assertPublicHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Design DNA requires a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Design DNA can only extract from http or https URLs");
  }

  const hostname = getHostname(url);
  const blockedHosts = new Set(["localhost", "metadata.google.internal"]);
  if (
    blockedHosts.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIp(hostname)
  ) {
    throw new Error("Design DNA cannot extract from private or internal URLs");
  }

  return url;
}

async function fetchTextWithTimeout(url: string, timeoutMs: number, signalLabel: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
    if (!response.ok) throw new Error(`${signalLabel} fetch failed (${response.status})`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function safeResolveUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value, baseUrl);
    assertPublicHttpUrl(url.toString());
    return url.toString();
  } catch {
    return null;
  }
}

function collectTextSamples($: cheerio.CheerioAPI) {
  const buckets: Record<string, string[]> = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    p: [],
    button: [],
    link: [],
    nav: [],
    label: [],
  };

  const add = (bucket: keyof typeof buckets, value: string) => {
    const sample = trimSample(value);
    if (sample && !buckets[bucket].includes(sample)) buckets[bucket].push(sample);
  };

  $("h1,h2,h3,h4,p,button,a,nav,label,input,textarea").each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    const text = tag === "input" || tag === "textarea"
      ? String($(element).attr("placeholder") || "")
      : $(element).text();
    if (tag === "a") add("link", text);
    else if (tag && tag in buckets) add(tag as keyof typeof buckets, text);
  });

  return Object.fromEntries(Object.entries(buckets).map(([key, values]) => [key, values.slice(0, 8)]));
}

function collectDomSignals($: cheerio.CheerioAPI) {
  const classNames: string[] = [];
  const ids: string[] = [];
  const semanticTags: string[] = [];

  $("[class]").each((_, element) => {
    const value = $(element).attr("class") || "";
    classNames.push(...value.split(/\s+/).map((item) => item.toLowerCase()).filter(Boolean));
  });
  $("[id]").each((_, element) => {
    const value = ($(element).attr("id") || "").toLowerCase();
    if (value) ids.push(value);
  });
  $("nav,header,main,section,footer,article,aside,form,table").each((_, element) => {
    semanticTags.push(element.tagName.toLowerCase());
  });

  return {
    classNames: unique(classNames).slice(0, 300),
    ids: unique(ids).slice(0, 120),
    semanticTags: unique(semanticTags),
  };
}

function extractStylesheetUrls($: cheerio.CheerioAPI, baseUrl: string) {
  const urls: string[] = [];
  $('link[rel~="stylesheet"][href]').each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const resolved = safeResolveUrl(href, baseUrl);
    if (resolved && !urls.includes(resolved)) urls.push(resolved);
  });
  return urls.slice(0, MAX_STYLESHEETS);
}

function getInlineCss($: cheerio.CheerioAPI) {
  const blocks: string[] = [];
  $("style").each((_, element) => {
    const css = $(element).html();
    if (css) blocks.push(css);
  });
  $("[style]").each((_, element) => {
    const style = $(element).attr("style");
    if (style) blocks.push(`.nyabag-inline-style { ${style} }`);
  });
  return blocks;
}

function maybeNormalizeColor(value: string) {
  const raw = value.trim();
  if (!raw || /^(transparent|currentColor|inherit|initial|unset)$/i.test(raw)) return null;
  if (/rgba?\([^)]*,\s*0\s*\)$/i.test(raw)) return null;

  try {
    const parsed = parseColor(raw);
    if (!parsed) return null;
    const hex = formatHex(parsed)?.toUpperCase();
    if (!hex || !/^#[0-9A-F]{6}$/.test(hex)) return null;
    return {
      hex,
      rgb: formatRgb(parsed),
    };
  } catch {
    return null;
  }
}

function colorTokens(value: string) {
  const tokens: string[] = [];
  const patterns = [
    /#[0-9a-fA-F]{3,8}\b/g,
    /rgba?\([^)]+\)/g,
    /hsla?\([^)]+\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) tokens.push(match[0]);
  }

  return tokens;
}

function inferColorUsage(prop: string, variableName?: string) {
  const haystack = `${prop} ${variableName || ""}`.toLowerCase();
  if (/primary|accent|brand|link|button|cta/.test(haystack)) return "primary-accent";
  if (/background|surface|canvas/.test(haystack)) return "background";
  if (/foreground|text|color/.test(haystack)) return "text";
  if (/border|outline|stroke/.test(haystack)) return "border";
  return "supporting";
}

function addColorCandidate(
  map: Map<string, ColorCandidate>,
  color: { hex: string; rgb?: string },
  prop: string,
  source: DesignDnaColorItem["source"],
  variableName?: string
) {
  const existing = map.get(color.hex);
  if (existing) {
    existing.count += 1;
    if (source === "css-variable") existing.source = source;
    return;
  }

  map.set(color.hex, {
    hex: color.hex,
    rgb: color.rgb,
    usage: inferColorUsage(prop, variableName),
    source,
    variableName,
    count: 1,
  });
}

function declarationMap(rule: Rule) {
  const values: Record<string, string> = {};
  rule.walkDecls((decl) => {
    values[decl.prop.toLowerCase()] = compactText(decl.value);
  });
  return values;
}

function selectorRole(selector: string) {
  const normalized = selector.toLowerCase();
  if (/\bh1\b|\.h1|hero.*title|headline/.test(normalized)) return "H1";
  if (/\bh2\b|\.h2/.test(normalized)) return "H2";
  if (/\bh3\b|\.h3/.test(normalized)) return "H3";
  if (/\b(body|p|article)\b|body|paragraph|copy/.test(normalized)) return "Body text";
  if (/\bsmall\b|caption|description|subtitle|eyebrow/.test(normalized)) return "Description";
  if (/button|\.btn|cta/.test(normalized)) return "Button";
  if (/\bnav\b|navbar|navigation/.test(normalized)) return "Navigation";
  return null;
}

function getSampleForRole(role: string, samples: Record<string, string[]>) {
  if (role === "H1") return samples.h1?.[0] || samples.h2?.[0];
  if (role === "H2") return samples.h2?.[0] || samples.h3?.[0];
  if (role === "H3") return samples.h3?.[0] || samples.h4?.[0];
  if (role === "Button") return samples.button?.[0] || samples.link?.[0];
  if (role === "Navigation") return samples.nav?.[0] || samples.link?.[0];
  if (role === "Description") return samples.p?.[1] || samples.label?.[0] || samples.p?.[0];
  return samples.p?.[0] || samples.h1?.[0] || "Manage your work with patients";
}

function fontFamilyName(stack: string) {
  return stack
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim();
}

function makeTypographyItem(
  role: string,
  candidate: TypographyCandidate | undefined,
  samples: Record<string, string[]>,
  fallbackFont: string,
  estimated: Partial<Record<string, string>>
): DesignDnaTypographyItem {
  const declarations = candidate?.declarations ?? {};
  const fontStack = declarations["font-family"] || fallbackFont || "system-ui, sans-serif";
  const hasDirectTypeRule = Boolean(candidate && (declarations["font-size"] || declarations["font-family"]));

  return {
    role,
    sample: getSampleForRole(role, samples),
    fontFamily: fontFamilyName(fontStack),
    fontStack,
    fontSize: declarations["font-size"] || estimated.fontSize || "14px",
    fontWeight: declarations["font-weight"] || estimated.fontWeight || "400",
    lineHeight: declarations["line-height"] || estimated.lineHeight || "1.5",
    letterSpacing: declarations["letter-spacing"],
    color: declarations.color,
    selector: candidate?.selector,
    confidence: hasDirectTypeRule ? "inferred" : "estimated",
    source: hasDirectTypeRule ? "css-rule" : fallbackFont ? "metadata" : "fallback",
  };
}

function detectFromSignals(signals: string[]) {
  const joined = signals.join(" ");
  const components = new Set<string>();
  const patterns = new Set<string>();
  const has = (pattern: RegExp) => pattern.test(joined);

  if (has(/\bnav\b|navbar|navigation/)) components.add("navbar");
  if (has(/\bhero\b|headline|masthead/)) {
    components.add("hero-section");
    patterns.add("hero-section");
  }
  if (has(/\bbtn\b|button|cta/)) components.add("primary-button");
  if (has(/\bcard\b|tile/)) components.add("card");
  if (has(/\bform\b|input|field/)) components.add("form");
  if (has(/search/)) components.add("search-input");
  if (has(/pricing|price/)) {
    components.add("pricing-card");
    patterns.add("pricing-section");
  }
  if (has(/testimonial|review/)) {
    components.add("testimonial-card");
    patterns.add("testimonial-section");
  }
  if (has(/logo|client|brand-strip/)) components.add("logo-strip");
  if (has(/footer/)) components.add("footer");
  if (has(/sidebar|aside/)) {
    components.add("sidebar");
    patterns.add("sidebar-layout");
  }
  if (has(/\btab\b|tabs/)) components.add("tabs");
  if (has(/accordion|faq/)) components.add("accordion");
  if (has(/modal|dialog/)) components.add("modal");
  if (has(/table|datatable|data-table/)) components.add("table");
  if (has(/chart|graph/)) components.add("chart");
  if (has(/gallery|portfolio|grid-images/)) components.add("gallery");
  if (has(/dropdown|menu/)) components.add("dropdown");
  if (has(/badge|pill|tag/)) components.add("badge");
  if (has(/avatar|profile/)) components.add("avatar");
  if (has(/breadcrumb/)) components.add("breadcrumb");
  if (has(/pagination|pager/)) components.add("pagination");

  if (has(/split|two-col|two-column/)) patterns.add("split-layout");
  if (has(/card-grid|cards-grid/)) patterns.add("card-grid");
  if (has(/bento/)) patterns.add("bento-grid");
  if (has(/feature|features/)) patterns.add("feature-grid");
  if (has(/sticky|fixed/)) patterns.add("sticky-header");
  if (has(/centered|container/)) patterns.add("centered-layout");
  if (has(/masonry/)) patterns.add("masonry-grid");
  if (has(/dashboard|analytics/)) patterns.add("dashboard-layout");
  if (has(/content-grid/)) patterns.add("content-grid");

  return { components, patterns };
}

function parseCss(css: string, samples: Record<string, string[]>, fallbackFonts: string[], fallbackPalette: string[] | null | undefined) {
  const root = postcss().process(css, { parser: safeParser }).root;
  const colorMap = new Map<string, ColorCandidate>();
  const typographyCandidates: TypographyCandidate[] = [];
  const cssVariables: Record<string, string> = {};
  const fontFamilies: string[] = [];
  const componentSignals: string[] = [];
  const layoutSignals: string[] = [];

  root.walkRules((rule) => {
    const selector = rule.selector || "";
    componentSignals.push(selector.toLowerCase());
    layoutSignals.push(selector.toLowerCase());
    const declarations = declarationMap(rule);
    const role = selectorRole(selector);

    if (role && Object.keys(declarations).some((prop) =>
      ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"].includes(prop)
    )) {
      typographyCandidates.push({ role, selector, declarations });
    }

    if (declarations["font-family"]) fontFamilies.push(fontFamilyName(declarations["font-family"]));
    if (/grid|flex|sticky|fixed|column|bento|layout/i.test(JSON.stringify(declarations))) {
      layoutSignals.push(`${selector} ${JSON.stringify(declarations)}`.toLowerCase());
    }
  });

  root.walkDecls((decl: Declaration) => {
    const prop = decl.prop.toLowerCase();
    const value = decl.value;
    if (prop.startsWith("--")) {
      cssVariables[prop] = value;
      if (/font|text|heading/.test(prop) && !/[#(]/.test(value)) {
        fontFamilies.push(fontFamilyName(value));
      }
    }

    const source: DesignDnaColorItem["source"] = prop.startsWith("--")
      ? "css-variable"
      : /background/.test(prop)
        ? "background"
        : /border|outline/.test(prop)
          ? "border"
          : /fill|stroke/.test(prop)
            ? "accent"
            : /color/.test(prop)
              ? "text"
              : "unknown";

    if (
      prop.startsWith("--") ||
      ["color", "background", "background-color", "border-color", "outline-color", "fill", "stroke", "box-shadow"].includes(prop)
    ) {
      for (const token of colorTokens(value)) {
        const normalized = maybeNormalizeColor(token);
        if (normalized) addColorCandidate(colorMap, normalized, prop, source, prop.startsWith("--") ? prop : undefined);
      }
    }
  });

  for (const color of fallbackPalette ?? []) {
    const normalized = maybeNormalizeColor(color);
    if (normalized) addColorCandidate(colorMap, normalized, "bookmark-palette", "bookmark-palette");
  }

  const roles = [
    ["H1", { fontSize: "48px", fontWeight: "700", lineHeight: "1.08" }],
    ["H2", { fontSize: "30px", fontWeight: "650", lineHeight: "1.18" }],
    ["H3", { fontSize: "22px", fontWeight: "600", lineHeight: "1.25" }],
    ["Body text", { fontSize: "16px", fontWeight: "400", lineHeight: "1.55" }],
    ["Description", { fontSize: "14px", fontWeight: "400", lineHeight: "1.5" }],
    ["Button", { fontSize: "14px", fontWeight: "650", lineHeight: "1.2" }],
    ["Navigation", { fontSize: "14px", fontWeight: "550", lineHeight: "1.2" }],
  ] as const;
  const fallbackFont = unique([...fontFamilies, ...fallbackFonts]).filter(Boolean)[0] || "system-ui, sans-serif";
  const typography = roles
    .map(([role, estimated]) =>
      makeTypographyItem(
        role,
        typographyCandidates.find((candidate) => candidate.role === role),
        samples,
        fallbackFont,
        estimated
      )
    )
    .filter((item, index) => index < 6 || item.selector);

  const sortedColors = Array.from(colorMap.values())
    .sort((a, b) => {
      const aPriority = a.source === "css-variable" ? 3 : a.source === "background" ? 2 : 1;
      const bPriority = b.source === "css-variable" ? 3 : b.source === "background" ? 2 : 1;
      return bPriority - aPriority || b.count - a.count;
    })
    .slice(0, 8)
    .map((item, index): DesignDnaColorItem => ({
      name: getDesignDnaColorName(item.hex, index),
      hex: item.hex,
      rgb: item.rgb,
      usage: item.usage,
      source: item.source,
      count: item.count,
    }));

  const detected = detectFromSignals([...componentSignals, ...layoutSignals]);

  return {
    typography,
    colors: sortedColors,
    fontFamilies: unique([...fontFamilies, ...fallbackFonts]).filter(Boolean).slice(0, 20),
    typographyCandidates: typographyCandidates.slice(0, 40),
    colorCandidates: Array.from(colorMap.values()).slice(0, 80),
    cssVariables,
    componentSignals: Array.from(detected.components),
    layoutSignals: Array.from(detected.patterns),
  };
}

async function fetchStylesheets(urls: string[]) {
  const cssBlocks: string[] = [];
  let cssBytesFetched = 0;
  const fetchedUrls: string[] = [];

  for (const url of urls) {
    if (cssBytesFetched >= MAX_TOTAL_CSS_BYTES) break;
    try {
      const css = await fetchTextWithTimeout(url, CSS_TIMEOUT_MS, "CSS");
      const remaining = MAX_TOTAL_CSS_BYTES - cssBytesFetched;
      const sliced = css.slice(0, remaining);
      cssBlocks.push(sliced);
      cssBytesFetched += Buffer.byteLength(sliced);
      fetchedUrls.push(url);
    } catch {
      // CSS is best-effort; HTML and fallback metadata can still produce a useful guide.
    }
  }

  return { css: cssBlocks.join("\n"), cssBytesFetched, fetchedUrls };
}

export async function extractDesignDnaFromHtmlCss(
  url: string,
  fallback?: {
    title?: string;
    screenshotUrl?: string | null;
    palette?: string[] | null;
    fonts?: string[] | null;
  }
): Promise<ExtractedDesignDna> {
  const source = assertPublicHttpUrl(url);
  const html = await fetchTextWithTimeout(source.toString(), HTML_TIMEOUT_MS, "HTML");
  const $ = cheerio.load(html);
  const htmlTitle = compactText($("title").first().text());
  const metaDescription = compactText(
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content")
  );
  const sourceTitle = htmlTitle || fallback?.title || getHostname(source);
  const samples = collectTextSamples($);
  const domSignals = collectDomSignals($);
  const stylesheetUrls = extractStylesheetUrls($, source.toString());
  const inlineCssBlocks = getInlineCss($);
  const stylesheets = await fetchStylesheets(stylesheetUrls);
  const parsedCss = parseCss(
    `${inlineCssBlocks.join("\n")}\n${stylesheets.css}`,
    samples,
    fallback?.fonts ?? [],
    fallback?.palette
  );
  const domDetected = detectFromSignals([
    ...domSignals.classNames,
    ...domSignals.ids,
    ...domSignals.semanticTags,
    ...Object.values(samples).flat(),
  ].map((value) => value.toLowerCase()));

  if (domSignals.semanticTags.includes("nav")) domDetected.components.add("navbar");
  if (domSignals.semanticTags.includes("footer")) domDetected.components.add("footer");
  if (domSignals.semanticTags.includes("form")) domDetected.components.add("form");
  if (domSignals.semanticTags.includes("table")) domDetected.components.add("table");
  if (domSignals.semanticTags.includes("aside")) domDetected.components.add("sidebar");
  if (samples.h1?.length) domDetected.patterns.add("hero-section");

  return {
    title: fallback?.title || sourceTitle,
    sourceUrl: source.toString(),
    sourceDomain: getHostname(source).replace(/^www\./, ""),
    sourceTitle,
    screenshotUrl: fallback?.screenshotUrl ?? null,
    typography: parsedCss.typography,
    colors: parsedCss.colors,
    components: unique([...parsedCss.componentSignals, ...Array.from(domDetected.components)]).slice(0, 16),
    layoutPatterns: unique([...parsedCss.layoutSignals, ...Array.from(domDetected.patterns)]).slice(0, 14),
    rawExtraction: {
      htmlTitle,
      metaDescription,
      stylesheetUrls: stylesheets.fetchedUrls,
      inlineStyleCount: inlineCssBlocks.length,
      cssBytesFetched: stylesheets.cssBytesFetched,
      fontFamilies: parsedCss.fontFamilies,
      typographyCandidates: parsedCss.typographyCandidates,
      colorCandidates: parsedCss.colorCandidates,
      cssVariables: parsedCss.cssVariables,
      componentSignals: unique([...domSignals.classNames, ...domSignals.ids]).slice(0, 120),
      layoutSignals: parsedCss.layoutSignals,
      textSamples: samples,
      extractionMethod: "html-css",
    },
  };
}
