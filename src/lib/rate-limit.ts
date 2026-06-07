import "server-only";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { createAdminServiceClient } from "@/lib/admin/service";

type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetAt: string;
    }
  | {
      allowed: false;
      remaining: 0;
      resetAt: string;
      error: string;
    };

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function getClientIp() {
  const h = await headers();

  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

export async function checkRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = createAdminServiceClient();

  const safeIdentifier = hashIdentifier(identifier);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();

  const { data: existing, error: readError } = await supabase
    .from("rate_limits")
    .select("id,count,window_start")
    .eq("scope", scope)
    .eq("identifier", safeIdentifier)
    .maybeSingle();

  if (readError) {
    console.error("[rate-limit] read failed:", readError.message);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      error: "Rate limit check failed",
    };
  }

  const windowStart = existing?.window_start
    ? new Date(existing.window_start)
    : null;

  const windowExpired =
    !windowStart || now.getTime() - windowStart.getTime() >= windowSeconds * 1000;

  if (!existing || windowExpired) {
    const { error: upsertError } = await supabase.from("rate_limits").upsert(
      {
        scope,
        identifier: safeIdentifier,
        count: 1,
        window_start: now.toISOString(),
      },
      { onConflict: "scope,identifier" }
    );

    if (upsertError) {
      console.error("[rate-limit] upsert failed:", upsertError.message);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        error: "Rate limit update failed",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  if (existing.count >= limit) {
    const actualResetAt = new Date(
      windowStart.getTime() + windowSeconds * 1000
    ).toISOString();

    return {
      allowed: false,
      remaining: 0,
      resetAt: actualResetAt,
      error: "Too many requests. Please try again later.",
    };
  }

  const nextCount = existing.count + 1;

  const { error: updateError } = await supabase
    .from("rate_limits")
    .update({ count: nextCount })
    .eq("id", existing.id);

  if (updateError) {
    console.error("[rate-limit] update failed:", updateError.message);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      error: "Rate limit update failed",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - nextCount),
    resetAt: new Date(windowStart.getTime() + windowSeconds * 1000).toISOString(),
  };
}

export function userLimitKey(userId: string) {
  return `user:${userId}`;
}

export function ipLimitKey(ip: string) {
  return `ip:${ip}`;
}

export function telegramLimitKey(telegramUserId: string | null, chatId: string | null) {
  return `telegram:${telegramUserId || "unknown"}:${chatId || "unknown"}`;
}