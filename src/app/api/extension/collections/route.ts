import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionUser } from "@/lib/extension/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateExtensionUser(request);

  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // MVP: return Inbox only. Replace with real Bags/Collections once the DB table exists.
  return NextResponse.json({
    collections: [
      {
        id: null,
        name: "Inbox",
        itemCount: null,
        color: "#f5f0df",
      },
    ],
  });
}
