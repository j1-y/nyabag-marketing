const MAX_TELEGRAM_URLS = 10;
const TRAILING_PUNCTUATION = /[.,)\]}>\s]+$/;
const URL_CANDIDATE = /https?:\/\/[^\s<>"']+/gi;

function normalizeUrl(candidate: string) {
  const cleaned = candidate.trim().replace(TRAILING_PUNCTUATION, "");
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_CANDIDATE) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const normalized = normalizeUrl(match);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    urls.push(normalized);

    if (urls.length >= MAX_TELEGRAM_URLS) break;
  }

  return urls;
}
