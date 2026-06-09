/**
 * CORS helper for the Nyabag browser extension API routes.
 *
 * Chrome extensions (Manifest V3) make fetch() calls from:
 *   - popup.js          → chrome-extension://<id>/popup/popup.html
 *   - service-worker.js → chrome-extension://<id>/background/service-worker.js
 *
 * These are treated as cross-origin by the browser, so every response from
 * an API route must include the appropriate CORS headers, otherwise Chrome
 * blocks the response before the extension can read it.
 *
 * Usage:
 *   return extensionCors(NextResponse.json({ ... }));
 *   // or for OPTIONS preflight:
 *   if (request.method === "OPTIONS") return extensionCorsPreflight();
 */

import type { NextRequest, NextResponse as NextResponseType } from "next/server";
import { NextResponse } from "next/server";

/**
 * Origins allowed to use the extension API.
 * - chrome-extension://*  covers any installed Chrome/Edge extension.
 * - null covers Postman / curl requests that send no Origin header.
 */
function isCorsAllowed(origin: string | null): boolean {
  if (!origin) return true; // server-to-server / curl — allow
  if (/^chrome-extension:\/\//i.test(origin)) return true;
  if (/^moz-extension:\/\//i.test(origin)) return true; // Firefox
  return false;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Attach CORS headers to any NextResponse so Chrome lets the extension
 * read the response body.
 */
export function extensionCors<T extends NextResponseType>(
  response: T,
  origin: string | null = null
): T {
  if (isCorsAllowed(origin)) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origin ?? "*"
    );
  }
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Handle OPTIONS preflight requests. Call this at the top of every route
 * that needs CORS:
 *
 *   export function OPTIONS(request: NextRequest) {
 *     return handleExtensionPreflight(request);
 *   }
 */
export function handleExtensionPreflight(request: NextRequest): NextResponseType {
  const origin = request.headers.get("origin");
  if (!isCorsAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      ...CORS_HEADERS,
    },
  });
}
