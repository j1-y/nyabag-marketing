import { createClient } from "@/lib/supabase/server";
import { getNotes, getSections } from "@/lib/canvas-data";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";

export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [notes, sections] = await Promise.all([getNotes(), getSections()]);

  return <CanvasBoard initialNotes={notes} initialSections={sections} userEmail={user?.email ?? ""} />;
}
