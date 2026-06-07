import "server-only";

import dns from "node:dns/promises";
import net from "node:net";

export type UrlSafetyResult =
  | {
      safe: true;
      url: string;
      hostname: string;
    }
  | {
      safe: false;
      error: string;
    };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

const BLOCKED_EXACT_IPS = new Set([
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "169.254.169.254",
]);

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIPv6(ip: string) {
  const normalized = ip.toLowerCase();

  if (normalized === "::1") return true;
  if (normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  if (
    normalized.includes("127.0.0.1") ||
    normalized.includes("169.254.169.254")
  ) {
    return true;
  }

  return false;
}

function isBlockedIp(ip: string) {
  if (BLOCKED_EXACT_IPS.has(ip)) return true;

  const version = net.isIP(ip);

  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);

  return true;
}

function isInternalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");

  if (!normalized) return true;
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;

  if (
    normalized.endsWith(".local") ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".lan") ||
    normalized.endsWith(".home") ||
    normalized.endsWith(".corp")
  ) {
    return true;
  }

  if (!normalized.includes(".")) return true;

  return false;
}

function normalizeHttpUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();

  if (!trimmed) return null;

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

export async function validatePublicHttpUrl(
  rawUrl: string
): Promise<UrlSafetyResult> {
  const parsed = normalizeHttpUrl(rawUrl);

  if (!parsed) {
    return {
      safe: false,
      error: "Must be a valid public HTTP or HTTPS URL",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      error: "Only HTTP and HTTPS URLs are allowed",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      safe: false,
      error: "URLs with embedded credentials are not allowed",
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isInternalHostname(hostname)) {
    return {
      safe: false,
      error: "Internal or local hostnames are not allowed",
    };
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    return {
      safe: false,
      error: "Private, local, or reserved IP addresses are not allowed",
    };
  }

  try {
    const records = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (records.length === 0) {
      return {
        safe: false,
        error: "Could not resolve this URL",
      };
    }

    const blockedRecord = records.find((record) => isBlockedIp(record.address));

    if (blockedRecord) {
      return {
        safe: false,
        error: "This URL resolves to a private, local, or reserved address",
      };
    }
  } catch {
    return {
      safe: false,
      error: "Could not verify this URL",
    };
  }

  parsed.hash = "";

  return {
    safe: true,
    url: parsed.toString(),
    hostname,
  };
}