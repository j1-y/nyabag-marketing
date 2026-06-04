import dns from "node:dns/promises";
import net from "node:net";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import sharp from "sharp";

const BUCKET = "bookmark-screenshots";

const DEFAULT_PALETTES = [
  ["#3B82F6", "#EFF6FF", "#1E3A5F", "#93C5FD", "#DBEAFE"],
  ["#8B5CF6", "#EDE9FE", "#4C1D95", "#C4B5FD", "#DDD6FE"],
  ["#10B981", "#ECFDF5", "#064E3B", "#6EE7B7", "#D1FAE5"],
  ["#F59E0B", "#FFFBEB", "#78350F", "#FCD34D", "#FEF3C7"],
  ["#EF4444", "#FEF2F2", "#7F1D1D", "#FCA5A5", "#FEE2E2"],
  ["#EC4899", "#FDF2F8", "#831843", "#F9A8D4", "#FCE7F3"],
  ["#14B8A6", "#F0FDFA", "#134E4A", "#5EEAD4", "#CCFBF1"],
  ["#F97316", "#FFF7ED", "#7C2D12", "#FDBA74", "#FED7AA"],
];

const DEFAULT_FONTS = [
  ["Inter", "Georgia"],
  ["Roboto", "Playfair Display"],
  ["Poppins", "Lora"],
  ["Lato", "Merriweather"],
  ["Nunito", "Source Serif Pro"],
  ["Outfit", "DM Serif Display"],
  ["Plus Jakarta Sans", "EB Garamond"],
];

const CATEGORY_RULES = [
  ["design", ["design", "portfolio", "inspiration", "ui", "ux", "creative", "branding"]],
  ["development", ["developer", "code", "software", "api", "github", "framework", "documentation"]],
  ["ai", ["ai", "artificial intelligence", "machine learning", "llm", "automation"]],
  ["productivity", ["productivity", "workspace", "docs", "notes", "tasks", "collaboration"]],
  ["news", ["news", "journalism", "article", "media", "magazine"]],
  ["social", ["social", "community", "network", "followers", "posts"]],
  ["video", ["video", "streaming", "watch", "clips", "channel"]],
  ["tools", ["tool", "platform", "dashboard", "workflow", "service", "app"]],
];

const GENERIC_WORDS = new Set([
  "about",
  "after",
  "also",
  "best",
  "from",
  "have",
  "into",
  "official",
  "online",
  "page",
  "that",
  "their",
  "this",
  "website",
  "with",
  "your",
]);

function envNumber(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envBoolean(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.toLowerCase() === "true";
}

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function seedFor(value) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function fallbackPalette(url) {
  const domain = getDomain(url);
  return DEFAULT_PALETTES[seedFor(domain) % DEFAULT_PALETTES.length];
}

function fallbackFonts(url) {
  const domain = getDomain(url);
  return DEFAULT_FONTS[seedFor(domain) % DEFAULT_FONTS.length];
}

function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferTags(url, title, summary) {
  const text = `${getDomain(url)} ${title} ${summary}`.toLowerCase();
  const tags = [];

  for (const [tag, terms] of CATEGORY_RULES) {
    if (terms.some((term) => text.includes(term))) tags.push(tag);
  }

  const words = text.match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? [];
  for (const word of words) {
    if (!GENERIC_WORDS.has(word)) tags.push(normalizeTag(word));
    if (tags.length >= 8) break;
  }

  return Array.from(new Set(tags.filter(Boolean))).slice(0, 8);
}

function isPrivateIPv4(address) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isBlockedHostname(hostname) {
  const lower = hostname.toLowerCase();

  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower === "0.0.0.0" ||
    lower === "::1"
  );
}

async function assertSafeUrl(rawUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Localhost URLs are not allowed");
  }

  const ipVersion = net.isIP(parsed.hostname);

  if (ipVersion === 4 && isPrivateIPv4(parsed.hostname)) {
    throw new Error("Private network URLs are not allowed");
  }

  if (ipVersion === 6) {
    throw new Error("IPv6 literal URLs are not allowed");
  }

  const addresses = await dns.lookup(parsed.hostname, {
    all: true,
    verbatim: true,
  });

  for (const address of addresses) {
    if (address.family === 4 && isPrivateIPv4(address.address)) {
      throw new Error("Private network URLs are not allowed");
    }

    if (
      address.family === 6 &&
      ["::1", "fc", "fd", "fe80"].some((prefix) =>
        address.address.toLowerCase().startsWith(prefix)
      )
    ) {
      throw new Error("Private network URLs are not allowed");
    }
  }

  return parsed.toString();
}

async function claimJob(supabase, workerId) {
  const { data, error } = await supabase.rpc("claim_bookmark_processing_job", {
    worker_id: workerId,
  });

  if (error) throw new Error(`Could not claim job: ${error.message}`);
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  return Array.isArray(data) ? data[0] : data;
}

async function updateBookmarkProcessing(supabase, job) {
  const { error } = await supabase
    .from("bookmarks")
    .update({
      processing_status: "processing",
      processing_error: null,
      enrichment_started_at: nowIso(),
      enrichment_finished_at: null,
    })
    .eq("id", job.bookmark_id)
    .eq("user_id", job.user_id)
    .eq("url", job.url);

  if (error) {
    throw new Error(`Could not mark bookmark processing: ${error.message}`);
  }
}

async function extractMetadata(page, url) {
  const metadata = await page.evaluate(() => {
    const meta = (...names) => {
      for (const name of names) {
        const selector = `meta[name="${name}"], meta[property="${name}"]`;
        const value = document.querySelector(selector)?.getAttribute("content");
        if (value) return value;
      }

      return "";
    };

    const title = meta("og:title", "twitter:title") || document.title || "";

    const summary =
      meta("description", "og:description", "twitter:description") || "";

    const font = getComputedStyle(document.body).fontFamily || "";

    return { title, summary, font };
  });

  const title = cleanText(metadata.title);
  const summary = cleanText(metadata.summary).slice(0, 1000);

  const pageFont = cleanText(metadata.font)
    .split(",")[0]
    ?.replaceAll("\"", "")
    .trim();

  const fonts = pageFont
    ? Array.from(new Set([pageFont, ...fallbackFonts(url)])).slice(0, 4)
    : fallbackFonts(url);

  return {
    title,
    summary,
    tags: inferTags(url, title, summary),
    fonts,
    refreshedAt: nowIso(),
  };
}

async function preparePageForScreenshot(page, timeoutMs) {
  console.log("[processor] preparing dynamic page");

  await page
    .waitForLoadState("domcontentloaded", { timeout: timeoutMs })
    .catch(() => undefined);

  await page
    .waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 8000) })
    .catch(() => undefined);

  await page
    .addStyleTag({
      content: `
        html {
          scroll-behavior: auto !important;
        }

        *, *::before, *::after {
          caret-color: transparent !important;
        }
      `,
    })
    .catch(() => undefined);

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getPageHeight = () =>
      Math.max(
        document.body?.scrollHeight || 0,
        document.body?.offsetHeight || 0,
        document.documentElement?.clientHeight || 0,
        document.documentElement?.scrollHeight || 0,
        document.documentElement?.offsetHeight || 0
      );

    const viewportHeight = window.innerHeight || 900;
    let totalHeight = getPageHeight();

    let y = 0;
    const step = Math.max(300, Math.floor(viewportHeight * 0.75));

    while (y < totalHeight) {
      window.scrollTo(0, y);
      await sleep(350);

      y += step;
      totalHeight = getPageHeight();
    }

    window.scrollTo(0, totalHeight);
    await sleep(700);

    window.scrollTo(0, 0);
    await sleep(1000);
  });

  await page.waitForTimeout(1000);
  console.log("[processor] dynamic page prepared");
}

async function capturePreview(browser, url, timeoutMs, width, height, fullPage, quality, maxWebpHeight) {
  const safeUrl = await assertSafeUrl(url);

  const page = await browser.newPage({
    viewport: { width, height },
    userAgent: "Nyabag bookmark preview bot",
  });

  try {
    await page.route("**/*", async (route) => {
      try {
        await assertSafeUrl(route.request().url());
        await route.continue();
      } catch {
        await route.abort();
      }
    });

    console.log(`[processor] screenshot started: ${safeUrl}`);

    await page.goto(safeUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    await preparePageForScreenshot(page, timeoutMs);

    const png = await page.screenshot({
      type: "png",
      fullPage,
      timeout: timeoutMs,
    });

    console.log("[processor] screenshot completed");

    const webp = await sharp(png, {
      animated: false,
      limitInputPixels: 300_000_000,
    })
      .rotate()
      .resize({
        width: 1200,
        height: maxWebpHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer();

    console.log("[processor] compression completed");

    const metadata = await extractMetadata(page, safeUrl);

    return { webp, metadata };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function markJobReady(supabase, job, screenshotPath, screenshotUrl, metadata) {
  const fallbackTitle = getDomain(job.url) || job.url;

  const { data: updatedBookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .update({
      title: metadata.title || fallbackTitle,
      summary: metadata.summary,
      tags: metadata.tags,
      palette: fallbackPalette(job.url),
      fonts: metadata.fonts,
      screenshot_url: screenshotUrl,
      screenshot_path: screenshotPath,
      screenshot_refreshed_at: metadata.refreshedAt,
      metadata_refreshed_at: metadata.refreshedAt,
      processing_status: "ready",
      processing_error: null,
      enrichment_finished_at: nowIso(),
    })
    .eq("id", job.bookmark_id)
    .eq("user_id", job.user_id)
    .eq("url", job.url)
    .select("id")
    .maybeSingle();

  if (bookmarkError) {
    throw new Error(`Could not update bookmark: ${bookmarkError.message}`);
  }

  if (!updatedBookmark) {
    throw new Error("Bookmark URL changed before processing completed");
  }

  const { error: jobError } = await supabase
    .from("bookmark_processing_jobs")
    .update({
      status: "ready",
      error_message: null,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id);

  if (jobError) {
    throw new Error(`Could not mark job ready: ${jobError.message}`);
  }
}

async function markJobFailed(supabase, job, error) {
  const message =
    error instanceof Error ? error.message : "Bookmark processing failed";

  const safeMessage = message.slice(0, 1000);
  const shouldRetry = job.attempts < job.max_attempts;
  const backoffMinutes = Math.min(8, 2 ** Math.max(1, job.attempts));
  const runAfter = new Date(Date.now() + backoffMinutes * 60_000).toISOString();

  if (shouldRetry) {
    await supabase
      .from("bookmark_processing_jobs")
      .update({
        status: "queued",
        error_message: safeMessage,
        locked_at: null,
        locked_by: null,
        run_after: runAfter,
      })
      .eq("id", job.id);

    await supabase
      .from("bookmarks")
      .update({
        processing_status: "queued",
        processing_error: safeMessage,
      })
      .eq("id", job.bookmark_id)
      .eq("user_id", job.user_id)
      .eq("url", job.url);

    console.log(`[processor] job retry queued: ${job.id}`);
    return;
  }

  await supabase
    .from("bookmark_processing_jobs")
    .update({
      status: "failed",
      error_message: safeMessage,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id);

  await supabase
    .from("bookmarks")
    .update({
      processing_status: "failed",
      processing_error: safeMessage,
      enrichment_finished_at: nowIso(),
    })
    .eq("id", job.bookmark_id)
    .eq("user_id", job.user_id)
    .eq("url", job.url);

  console.log(`[processor] job failed: ${job.id}`);
}

async function processJob(supabase, browser, job, config) {
  console.log(`[processor] job claimed: ${job.id}`);

  await updateBookmarkProcessing(supabase, job);

  const { webp, metadata } = await capturePreview(
    browser,
    job.url,
    config.timeoutMs,
    config.width,
    config.height,
    config.fullPage,
    config.quality,
    config.maxWebpHeight
  );

  const screenshotPath = `${job.user_id}/${job.bookmark_id}/screenshot-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(screenshotPath, webp, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  console.log("[processor] storage uploaded");

  const screenshotUrl = supabase.storage
    .from(BUCKET)
    .getPublicUrl(screenshotPath).data.publicUrl;

  await markJobReady(supabase, job, screenshotPath, screenshotUrl, metadata);

  console.log(`[processor] job ready: ${job.id}`);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const config = {
    maxJobs: envNumber("MAX_JOBS_PER_RUN", 5),
    timeoutMs: envNumber("SCREENSHOT_TIMEOUT_MS", 30_000),
    width: envNumber("SCREENSHOT_WIDTH", 1440),
    height: envNumber("SCREENSHOT_HEIGHT", 1100),
    fullPage: envBoolean("SCREENSHOT_FULL_PAGE", true),
    quality: envNumber("WEBP_QUALITY", 70),
    maxWebpHeight: envNumber("MAX_WEBP_HEIGHT", 15000),
  };

  const workerId =
    process.env.WORKER_ID ||
    process.env.GITHUB_RUN_ID ||
    `local-${Date.now()}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log("[processor] config", {
    maxJobs: config.maxJobs,
    timeoutMs: config.timeoutMs,
    width: config.width,
    height: config.height,
    fullPage: config.fullPage,
    quality: config.quality,
    maxWebpHeight: config.maxWebpHeight,
    workerId,
  });

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    for (let index = 0; index < config.maxJobs; index += 1) {
      const job = await claimJob(supabase, workerId);

      if (!job) {
        console.log("[processor] no queued jobs");
        break;
      }

      try {
        await processJob(supabase, browser, job, config);
      } catch (error) {
        console.error(
          `[processor] job error: ${job.id}`,
          error instanceof Error ? error.message : error
        );

        await markJobFailed(supabase, job, error);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(
    "[processor] fatal error:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});