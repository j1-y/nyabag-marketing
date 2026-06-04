import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminServiceClient } from "@/lib/admin/service";

export type CurrentAdmin = {
  id: string;
  email: string;
  role: string;
};

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    const service = createAdminServiceClient();
    const { data } = await service
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return null;

    return {
      id: user.id,
      email: user.email ?? "",
      role: data.role ?? "admin",
    };
  } catch (error) {
    console.error("[admin] Admin check failed:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await getCurrentAdmin();
  if (!admin) redirect("/");
  return admin;
}
