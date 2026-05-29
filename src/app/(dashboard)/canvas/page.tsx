import { createClient } from "@/lib/supabase/server";
import { getNotes } from "@/lib/canvas-data";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";

export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notes = await getNotes();

  return <CanvasBoard initialNotes={notes} userEmail={user?.email ?? ""} />;
}
