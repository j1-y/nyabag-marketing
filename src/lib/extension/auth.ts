import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type ExtensionUserAuthResult =
  | {
      success: true;
      user: {
        id: string;
        email?: string;
      };
      accessToken: string;
    }
  | {
      success: false;
      status: number;
      error: string;
    };

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export function createExtensionAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are not configured");
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function authenticateExtensionUser(
  request: NextRequest
): Promise<ExtensionUserAuthResult> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      success: false,
      status: 401,
      error: "Missing access token",
    };
  }

  try {
    const supabase = createExtensionAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return {
        success: false,
        status: 401,
        error: "Invalid or expired session",
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Could not authenticate extension user",
    };
  }
}
