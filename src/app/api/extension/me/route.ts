import { NextRequest, NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin/service";
import { authenticateExtensionUser } from "@/lib/extension/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateExtensionUser(request);

  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name,email")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: profile?.email || auth.user.email || "",
      name: profile?.name || "",
    },
  });
}
