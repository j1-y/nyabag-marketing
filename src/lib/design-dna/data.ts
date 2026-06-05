import { createClient } from "@/lib/supabase/server";
import type { DesignDna } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function getDesignDnaList(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("design_dna")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DesignDna[];
}

export async function getDesignDnaById(supabase: Supabase, id: string, userId: string) {
  const { data, error } = await supabase
    .from("design_dna")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DesignDna | null;
}

export async function getDesignDnaForBookmark(supabase: Supabase, bookmarkId: string, userId: string) {
  const { data, error } = await supabase
    .from("design_dna")
    .select("*")
    .eq("bookmark_id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DesignDna | null;
}
