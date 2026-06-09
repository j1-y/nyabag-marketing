import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminServiceClient } from "@/lib/admin/service";
import { authenticateExtensionUser } from "@/lib/extension/auth";
import { BOOKMARK_SCREENSHOT_BUCKET } from "@/lib/bookmarks/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 60-second signed upload URL — the extension uploads directly to Supabase Storage
const UPLOAD_URL_TTL_SECONDS = 60;

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionUser(request);

  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { bookmarkId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const bookmarkId = body.bookmarkId?.trim();
  if (!bookmarkId) {
    return NextResponse.json({ error: "bookmarkId is required" }, { status: 400 });
  }

  const supabase = createAdminServiceClient();

  // Verify the bookmark belongs to the authenticated user
  const { data: bookmark, error: lookupError } = await supabase
    .from("bookmarks")
    .select("id, user_id")
    .eq("id", bookmarkId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!bookmark) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  // Generate a unique path for the screenshot
  const path = `${auth.user.id}/${bookmarkId}/${crypto.randomUUID()}.jpg`;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BOOKMARK_SCREENSHOT_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (signedError || !signedData?.signedUrl) {
    console.error("[upload-url] createSignedUploadUrl failed:", signedError?.message);
    return NextResponse.json(
      { error: signedError?.message ?? "Could not generate upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    path,
  });
}
