export const MAX_IMPORT_URLS = 50;
const TRAILING_PUNCTUATION = /[),.;\]}]+$/;
const URL_CANDIDATE =
  /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi;

function cleanCandidate(candidate: string) {
  return candidate.trim().replace(TRAILING_PUNCTUATION, "");
}

function normalizeUrlCandidate(candidate: string) {
  const cleaned = cleanCandidate(candidate);
  if (!cleaned) return null;

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".")) return null;
    return withProtocol;
  } catch {
    return null;
  }
}

export function extractUrlsFromText(input: string): string[] {
  const matches = input.match(URL_CANDIDATE) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const normalized = normalizeUrlCandidate(match);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    urls.push(normalized);

    if (urls.length >= MAX_IMPORT_URLS) break;
  }

  return urls;
}
