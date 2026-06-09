import { NextRequest, NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin/service";
import { authenticateExtensionUser } from "@/lib/extension/auth";
import { BOOKMARK_SCREENSHOT_BUCKET } from "@/lib/bookmarks/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionUser(request);

  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { bookmarkId?: string; path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const bookmarkId = body.bookmarkId?.trim();
  const path = body.path?.trim();

  if (!bookmarkId || !path) {
    return NextResponse.json(
      { error: "bookmarkId and path are required" },
      { status: 400 }
    );
  }

  // Prevent path traversal — path must start with the user's own ID prefix
  if (!path.startsWith(`${auth.user.id}/`)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 403 });
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

  // Get the public URL for the uploaded screenshot
  const { data: publicUrlData } = supabase.storage
    .from(BOOKMARK_SCREENSHOT_BUCKET)
    .getPublicUrl(path);

  const screenshotUrl = publicUrlData?.publicUrl ?? null;

  // Commit: write the path and public URL back to the bookmark row
  const { error: updateError } = await supabase
    .from("bookmarks")
    .update({
      screenshot_path: path,
      screenshot_url: screenshotUrl,
      screenshot_refreshed_at: new Date().toISOString(),
      processing_status: "ready",
    })
    .eq("id", bookmarkId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    console.error("[commit-screenshot] update failed:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, screenshotUrl });
}
