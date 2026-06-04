import { getDomain } from "@/lib/data";

type ExtractedMetadata = {
  title: string | null;
  summary: string;
  tags: string[];
  refreshedAt: string | null;
};

const CATEGORY_RULES: Array<{ tag: string; terms: string[]; domains?: string[] }> = [
  { tag: "ecommerce", terms: ["shop", "shopping", "store", "buy", "cart", "checkout", "marketplace", "retail", "product"], domains: ["amazon.", "ebay.", "etsy.", "shopify."] },
  { tag: "marketplace", terms: ["marketplace", "seller", "vendors", "products", "deals"], domains: ["amazon.", "ebay.", "etsy."] },
  { tag: "design", terms: ["design", "portfolio", "inspiration", "ui", "ux", "creative", "branding"], domains: ["figma.", "dribbble.", "behance.", "awwwards."] },
  { tag: "development", terms: ["developer", "code", "software", "api", "github", "framework", "documentation", "open source"], domains: ["github.", "vercel.", "npmjs."] },
  { tag: "ai", terms: ["ai", "artificial intelligence", "machine learning", "llm", "automation", "agents"], domains: ["openai.", "anthropic."] },
  { tag: "productivity", terms: ["productivity", "workspace", "docs", "notes", "tasks", "collaboration", "project management"], domains: ["notion.", "linear.", "asana.", "trello."] },
  { tag: "finance", terms: ["finance", "banking", "payments", "pricing", "investment", "crypto", "wallet"], domains: ["stripe.", "paypal."] },
  { tag: "education", terms: ["learn", "course", "tutorial", "school", "university", "education", "training"] },
  { tag: "news", terms: ["news", "journalism", "breaking", "article", "media", "magazine"] },
  { tag: "social", terms: ["social", "community", "network", "followers", "posts"], domains: ["x.", "twitter.", "instagram.", "linkedin.", "reddit."] },
  { tag: "video", terms: ["video", "streaming", "watch", "clips", "channel"], domains: ["youtube.", "vimeo.", "netflix."] },
  { tag: "music", terms: ["music", "audio", "songs", "playlist", "podcast"], domains: ["spotify.", "soundcloud."] },
  { tag: "travel", terms: ["travel", "hotel", "flight", "booking", "destination", "trip"], domains: ["airbnb.", "booking."] },
  { tag: "food", terms: ["food", "restaurant", "recipe", "kitchen", "culinary", "meal"] },
  { tag: "tools", terms: ["tool", "platform", "dashboard", "workflow", "service", "app"] },
];

const GENERIC_WORDS = new Set([
  "about", "after", "all", "also", "and", "are", "best", "can", "for", "from", "get",
  "has", "have", "into", "its", "new", "not", "our", "the", "their", "this", "that",
  "with", "you", "your", "website", "official", "online", "home", "page",
]);

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getMetaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`,
      "i"
    );
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function getTitle(html: string): string | null {
  const ogTitle = getMetaContent(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function getJsonLdText(html: string): string {
  const chunks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join(" ");
  return decodeEntities(chunks.replace(/[{}[\]",:]/g, " "));
}

function summarize(html: string): string {
  const description = getMetaContent(html, [
    "description",
    "og:description",
    "twitter:description",
  ]);
  if (!description) return "";
  return description.length > 280 ? `${description.slice(0, 277).trim()}...` : description;
}

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function keywordTags(text: string): string[] {
  const counts = new Map<string, number>();
  const words = text
    .toLowerCase()
    .match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? [];

  for (const word of words) {
    if (GENERIC_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => normalizeTag(word))
    .filter(Boolean)
    .slice(0, 4);
}

function classifyTags(url: string, title: string | null, summary: string, keywords: string | null, jsonLd: string): string[] {
  const domain = getDomain(url);
  const haystack = `${domain} ${title ?? ""} ${summary} ${keywords ?? ""} ${jsonLd}`.toLowerCase();
  const tags: string[] = [];

  for (const rule of CATEGORY_RULES) {
    const domainMatch = rule.domains?.some((domainPart) => domain.includes(domainPart)) ?? false;
    const termMatch = rule.terms.some((term) => haystack.includes(term));
    if (domainMatch || termMatch) tags.push(rule.tag);
  }

  if (keywords) {
    tags.push(
      ...keywords
        .split(",")
        .map((tag) => normalizeTag(tag))
        .filter(Boolean)
        .slice(0, 5)
    );
  }

  tags.push(...keywordTags(`${title ?? ""} ${summary}`));

  return Array.from(new Set(tags)).slice(0, 8);
}

export async function scrapeBookmarkMetadata(url: string): Promise<ExtractedMetadata> {
  const fallback = { title: null, summary: "", tags: [], refreshedAt: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Nyabag metadata preview bot",
      },
      cache: "no-store",
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) return fallback;

    const html = (await response.text()).slice(0, 250_000);
    const title = getTitle(html);
    const summary = summarize(html);
    const keywords = getMetaContent(html, ["keywords", "news_keywords"]);
    const jsonLd = getJsonLdText(html);

    return {
      title,
      summary,
      tags: classifyTags(url, title, summary, keywords, jsonLd),
      refreshedAt: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}

export function mergeTags(userTags: string[], inferredTags: string[]): string[] {
  return Array.from(new Set([...userTags, ...inferredTags].map(normalizeTag).filter(Boolean))).slice(0, 20);
}
