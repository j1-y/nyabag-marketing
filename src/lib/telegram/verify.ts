import "server-only";

import crypto from "crypto";

function getVerificationSecret() {
  const secret = process.env.TELEGRAM_VERIFICATION_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("TELEGRAM_VERIFICATION_SECRET or TELEGRAM_WEBHOOK_SECRET is required.");
  }
  return secret;
}

export function normalizeVerificationCode(code: string) {
  const compact = code
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "");

  return compact.replace(/^NYB(?=\d{6}$)/, "NYB-");
}

export function generateVerificationCode(): string {
  const value = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return `NYB-${value}`;
}

export function hashVerificationCode(code: string): string {
  const normalizedCode = normalizeVerificationCode(code);
  return crypto
    .createHash("sha256")
    .update(`${getVerificationSecret()}:${normalizedCode}`)
    .digest("hex");
}

export function verifyCode(code: string, hash: string): boolean {
  const nextHash = hashVerificationCode(code);
  return crypto.timingSafeEqual(Buffer.from(nextHash), Buffer.from(hash));
}
