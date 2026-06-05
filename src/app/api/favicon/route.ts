import { NextRequest, NextResponse } from "next/server";

const ICON_REL_PATTERN =
  /<link\b(?=[^>]*\brel=["'][^"']*(?:icon|apple-touch-icon|shortcut icon)[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function isHttpUrl(url: URL) {
  return url.protocol === "http:" || url.protocol === "https:";
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getIconCandidates(html: string, baseUrl: URL) {
  const candidates: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = ICON_REL_PATTERN.exec(html))) {
    try {
      candidates.push(new URL(match[1], baseUrl).toString());
    } catch {
      // Skip malformed icon URLs.
    }
  }

  candidates.push(
    new URL("/favicon.ico", baseUrl).toString(),
    new URL("/favicon.png", baseUrl).toString(),
    new URL("/apple-touch-icon.png", baseUrl).toString()
  );

  return Array.from(new Set(candidates));
}

async function fetchIcon(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate, {
        headers: { Accept: "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8" },
        cache: "no-store",
        redirect: "follow",
      });
      const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";

      if (!response.ok || !IMAGE_TYPES.has(contentType)) continue;

      const bytes = await response.arrayBuffer();
      if (bytes.byteLength === 0 || bytes.byteLength > 512 * 1024) continue;

      return { bytes, contentType };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse(null, { status: 400 });

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!isHttpUrl(targetUrl)) return new NextResponse(null, { status: 400 });

  const fallbackCandidates = [
    new URL("/favicon.ico", targetUrl).toString(),
    new URL("/favicon.png", targetUrl).toString(),
    new URL("/apple-touch-icon.png", targetUrl).toString(),
  ];

  let candidates = fallbackCandidates;

  try {
    const pageResponse = await fetchWithTimeout(targetUrl.toString(), {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Nyabag favicon fetcher",
      },
      cache: "no-store",
      redirect: "follow",
    });
    const contentType = pageResponse.headers.get("content-type") ?? "";

    if (pageResponse.ok && contentType.toLowerCase().includes("text/html")) {
      const html = (await pageResponse.text()).slice(0, 200_000);
      candidates = getIconCandidates(html, new URL(pageResponse.url || targetUrl.toString()));
    }
  } catch {
    // Fall back to conventional icon paths.
  }

  const icon = await fetchIcon(candidates);
  if (!icon) return new NextResponse(null, { status: 404 });

  return new NextResponse(icon.bytes, {
    headers: {
      "Content-Type": icon.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
