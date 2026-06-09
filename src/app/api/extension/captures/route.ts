import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { createAdminServiceClient } from "@/lib/admin/service";
import { authenticateExtensionUser } from "@/lib/extension/auth";
import { checkRateLimit, userLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CAPTURES_BUCKET = "captures";
/** Max output width in pixels — preserves aspect ratio */
const MAX_WIDTH = 1600;
/** JPEG quality (0–100). 75 = good quality, ~5–8× smaller than raw capture */
const JPEG_QUALITY = 75;
/** Reject payloads larger than 15 MB (raw base64-decoded bytes) */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Signed URL lifetime: 1 year */
const SIGNED_URL_TTL = 365 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 120 screenshot captures per hour per user
  const rate = await checkRateLimit({
    scope: "extension-captures",
    identifier: userLimitKey(auth.user.id),
    limit: 120,
    windowSeconds: 60 * 60,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Capture limit reached. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    imageBase64?: string;
    mimeType?: string;
    pageUrl?: string;
    pageTitle?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    imageBase64,
    mimeType = "image/jpeg",
    pageUrl,
    pageTitle,
  } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  // Strip the data URL prefix (data:image/jpeg;base64,…) if present
  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const inputBuffer = Buffer.from(base64Data, "base64");

  if (inputBuffer.byteLength > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 15 MB)" },
      { status: 413 }
    );
  }

  const originalSize = inputBuffer.byteLength;

  // ── Compress with sharp ──────────────────────────────────────────────────────
  let compressed: Buffer;
  try {
    compressed = await sharp(inputBuffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error("[captures] sharp compression failed:", err);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────────
  const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
  const supabase = createAdminServiceClient();

  const { error: uploadError } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .upload(path, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("[captures] storage upload failed:", uploadError.message);
    return NextResponse.json(
      { error: uploadError.message ?? "Storage upload failed" },
      { status: 500 }
    );
  }

  // ── Generate a signed URL (1 year) for the caller ───────────────────────────
  const { data: signedData } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  const savings = Math.round((1 - compressed.byteLength / originalSize) * 100);
  console.log(
    `[captures] saved ${path} — ${originalSize} → ${compressed.byteLength} bytes (${savings}% smaller)`,
    pageUrl ? `| ${pageUrl}` : ""
  );

  return NextResponse.json({
    success: true,
    captureUrl: signedData?.signedUrl ?? null,
    path,
    pageUrl: pageUrl ?? null,
    pageTitle: pageTitle ?? null,
    originalSize,
    compressedSize: compressed.byteLength,
    savings: `${savings}%`,
  });
}
