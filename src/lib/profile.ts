import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function withAvatarUrl(
  supabase: Supabase,
  profile: UserProfile | null
): UserProfile | null {
  if (!profile?.avatar_path) return profile;

  const { data } = supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .getPublicUrl(profile.avatar_path);

  return { ...profile, avatar_url: data.publicUrl };
}

export async function getUserProfile(
  supabase: Supabase,
  user: User
): Promise<UserProfile> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = withAvatarUrl(supabase, data as UserProfile | null);
  if (profile) return profile;

  return {
    user_id: user.id,
    name: "",
    email: user.email ?? "",
    phone: "",
    avatar_path: null,
    avatar_url: null,
    created_at: "",
    updated_at: "",
  };
}
