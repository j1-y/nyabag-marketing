import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { noteUpdateSchema } from "@/lib/validations";
import type { ActionResult, CanvasNote } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ActionResult>({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = noteUpdateSchema.safeParse({
    id,
    content: body?.content,
    content_json: body?.content_json,
    content_format: "rich",
  });

  if (!parsed.success) {
    return NextResponse.json<ActionResult>(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { data: oldNote, error: oldNoteError } = await supabase
    .from("canvas_notes")
    .select("id,type")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .single();

  if (oldNoteError || !oldNote) {
    return NextResponse.json<ActionResult>({ success: false, error: "Note not found" }, { status: 404 });
  }

  if (oldNote.type !== "text" && oldNote.type !== "text_frame") {
    return NextResponse.json<ActionResult>(
      { success: false, error: "Only text notes support rich content" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("canvas_notes")
    .update({
      content: parsed.data.content,
      content_json: parsed.data.content_json,
      content_format: "rich",
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .in("type", ["text", "text_frame"])
    .select()
    .single();

  if (error) {
    return NextResponse.json<ActionResult>({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ActionResult<CanvasNote>>({
    success: true,
    data: data as unknown as CanvasNote,
  });
}
