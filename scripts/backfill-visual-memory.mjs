import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const limit = Math.max(1, Math.min(Number.parseInt(process.env.BACKFILL_LIMIT || "100", 10), 500));

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: bookmarks, error: bookmarkError } = await supabase
  .from("bookmarks")
  .select("id,user_id,url,processing_status")
  .neq("processing_status", "processing")
  .order("updated_at", { ascending: true })
  .limit(limit);

if (bookmarkError) throw new Error(bookmarkError.message);

const bookmarkIds = (bookmarks ?? []).map((bookmark) => bookmark.id);
const { data: existingFacts, error: factsError } = bookmarkIds.length
  ? await supabase
      .from("bookmark_visual_facts")
      .select("bookmark_id")
      .in("bookmark_id", bookmarkIds)
  : { data: [], error: null };

if (factsError) throw new Error(factsError.message);

const hasFacts = new Set((existingFacts ?? []).map((row) => row.bookmark_id));
const targets = (bookmarks ?? []).filter((bookmark) => !hasFacts.has(bookmark.id));

let queued = 0;
let failed = 0;

for (const bookmark of targets) {
  const { error: updateError } = await supabase
    .from("bookmarks")
    .update({
      processing_status: "queued",
      processing_error: null,
      semantic_status: "pending",
      semantic_error: null,
      semantic_processed_at: null,
    })
    .eq("id", bookmark.id)
    .eq("user_id", bookmark.user_id);

  if (updateError) {
    failed += 1;
    console.warn(`[visual-backfill] bookmark update failed ${bookmark.id}: ${updateError.message}`);
    continue;
  }

  const { error: jobError } = await supabase
    .from("bookmark_processing_jobs")
    .insert({
      bookmark_id: bookmark.id,
      user_id: bookmark.user_id,
      url: bookmark.url,
      status: "queued",
    });

  if (jobError && !/duplicate key/i.test(jobError.message)) {
    failed += 1;
    console.warn(`[visual-backfill] job enqueue failed ${bookmark.id}: ${jobError.message}`);
    continue;
  }

  queued += 1;
}

console.log(`[visual-backfill] scanned=${bookmarkIds.length} missing_facts=${targets.length} queued=${queued} failed=${failed}`);

