import { NextRequest, NextResponse } from "next/server";
import { createExtensionAuthClient } from "@/lib/extension/auth";
import { checkRateLimit, getClientIp, ipLimitKey } from "@/lib/rate-limit";
import { extensionCors, handleExtensionPreflight } from "@/lib/extension/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS(request: NextRequest) {
  return handleExtensionPreflight(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const ip = await getClientIp();

  const rate = await checkRateLimit({
    scope: "extension-login",
    identifier: ipLimitKey(ip),
    limit: 20,
    windowSeconds: 60 * 60,
  });

  if (!rate.allowed) {
    return extensionCors(
      NextResponse.json(
        { error: "Too many extension login attempts. Please try again later." },
        { status: 429 }
      ),
      origin
    );
  }

  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return extensionCors(
      NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }),
      origin
    );
  }

  const email = body.email?.trim();
  const password = body.password ?? "";

  if (!email || !password) {
    return extensionCors(
      NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      ),
      origin
    );
  }

  const supabase = createExtensionAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    return extensionCors(
      NextResponse.json(
        { error: error?.message ?? "Invalid email or password" },
        { status: 401 }
      ),
      origin
    );
  }

  return extensionCors(
    NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
    }),
    origin
  );
}
