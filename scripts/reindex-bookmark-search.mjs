#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const RETRIEVAL_SCHEMA_VERSION = 2;
const EMBEDDING_DIMENSION = 768;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
const BATCH_SIZE = Number.parseInt(process.env.SEARCH_REINDEX_BATCH_SIZE || "25", 10);
const START_OFFSET = Number.parseInt(process.env.SEARCH_REINDEX_OFFSET || "0", 10);
const DRY_RUN = process.env.SEARCH_REINDEX_DRY_RUN === "1";

function loadEnvFile(fileName) {
  const fullPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(fullPath)) return;

  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function requiredEnv(name, fallbackName) {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");
  if (!value) throw new Error(`Missing ${name}${fallbackName ? ` or ${fallbackName}` : ""}`);
  return value;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanArray(value, limit = 12) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const values = [];

  for (const item of value) {
    const text = clean(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    values.push(text);
    if (values.length >= limit) break;
  }

  return values;
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return clean(url).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

function addLine(lines, label, value) {
  const text = clean(value);
  if (text) lines.push(`${label}: ${text}`);
}

function addArrayLine(lines, label, value, limit = 12) {
  const values = cleanArray(value, limit);
  if (values.length) lines.push(`${label}: ${values.join(", ")}`);
}

function buildRetrievalDocument(bookmark, aiMetadata) {
  const lines = [`Retrieval schema: bookmark-v${RETRIEVAL_SCHEMA_VERSION}`];

  addLine(lines, "Title", bookmark.title);
  addLine(lines, "Domain", domainFromUrl(bookmark.url));
  addLine(lines, "User note", bookmark.note);
  addLine(lines, "Save reason", bookmark.save_reason);
  addLine(lines, "Visual evidence", bookmark.ai_description || bookmark.summary || aiMetadata?.design_context);
  addLine(lines, "Page type", aiMetadata?.page_type);
  addLine(lines, "Industry", aiMetadata?.industry);
  addArrayLine(lines, "User tags", bookmark.tags);
  addArrayLine(lines, "Specific AI tags", bookmark.ai_tags?.length ? bookmark.ai_tags : aiMetadata?.suggested_tags);
  addArrayLine(lines, "Layout structure", bookmark.ai_patterns?.length ? bookmark.ai_patterns : aiMetadata?.ui_patterns);
  addArrayLine(lines, "Visual style", aiMetadata?.visual_style);
  addArrayLine(lines, "Notable UI details", aiMetadata?.components);
  addArrayLine(lines, "Fonts", bookmark.fonts);

  return lines.join("\n").slice(0, 8_000);
}

function contentHash(text) {
  return crypto.createHash("sha256").update(`bookmark-retrieval-schema:${RETRIEVAL_SCHEMA_VERSION}\n${text}`).digest("hex");
}

function toPgVectorLiteral(values) {
  return `[${values.map((value) => (Number.isFinite(value) ? Number(value).toPrecision(12) : "0")).join(",")}]`;
}

async function createEmbedding(ai, text) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: `Document: ${text}`,
    config: { outputDimensionality: EMBEDDING_DIMENSION },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Gemini returned an empty embedding");
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${values.length}`);
  }
  return values;
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = requiredEnv("GEMINI_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  let offset = START_OFFSET;
  let scanned = 0;
  let skipped = 0;
  let updated = 0;
  let failed = 0;

  while (true) {
    const { data: bookmarks, error } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!bookmarks?.length) break;

    const ids = bookmarks.map((bookmark) => bookmark.id);
    const [{ data: metadataRows }, { data: embeddingRows }] = await Promise.all([
      supabase.from("bookmark_ai_metadata").select("*").in("bookmark_id", ids),
      supabase.from("bookmark_embeddings").select("bookmark_id, content_hash, model, retrieval_schema_version").in("bookmark_id", ids),
    ]);

    const metadataById = new Map((metadataRows ?? []).map((row) => [row.bookmark_id, row]));
    const embeddingById = new Map((embeddingRows ?? []).map((row) => [row.bookmark_id, row]));

    for (const bookmark of bookmarks) {
      scanned += 1;
      const text = buildRetrievalDocument(bookmark, metadataById.get(bookmark.id));
      const hash = contentHash(text);
      const existing = embeddingById.get(bookmark.id);
      const isCurrent =
        existing?.content_hash === hash &&
        existing.model === EMBEDDING_MODEL &&
        existing.retrieval_schema_version === RETRIEVAL_SCHEMA_VERSION;

      if (isCurrent) {
        skipped += 1;
        continue;
      }

      try {
        if (DRY_RUN) {
          updated += 1;
          console.log(`[dry-run] would reindex ${bookmark.id} ${bookmark.title}`);
          continue;
        }

        const embedding = await createEmbedding(ai, text);
        const { error: upsertError } = await supabase.from("bookmark_embeddings").upsert(
          {
            user_id: bookmark.user_id,
            bookmark_id: bookmark.id,
            embedding: toPgVectorLiteral(embedding),
            embedding_text: text,
            model: EMBEDDING_MODEL,
            content_hash: hash,
            retrieval_schema_version: RETRIEVAL_SCHEMA_VERSION,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "bookmark_id" },
        );

        if (upsertError) throw new Error(upsertError.message);
        updated += 1;
        console.log(`[reindex] updated ${bookmark.id} ${bookmark.title}`);
      } catch (itemError) {
        failed += 1;
        console.warn(`[reindex] failed ${bookmark.id}: ${itemError instanceof Error ? itemError.message : itemError}`);
      }
    }

    console.log(`[reindex] offset=${offset} scanned=${scanned} updated=${updated} skipped=${skipped} failed=${failed}`);
    offset += bookmarks.length;
    if (bookmarks.length < BATCH_SIZE) break;
  }

  console.log(`[reindex] complete scanned=${scanned} updated=${updated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[reindex] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
