import "server-only";

import { getGeminiClient, isGeminiConfigured } from "@/lib/ai/gemini";

export const EMBEDDING_DIMENSION = 768;
export const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";

const MAX_EMBEDDING_TEXT_CHARS = 12_000;
const EMBEDDING_TIMEOUT_MS = 15_000;

function normalizeEmbeddingText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_EMBEDDING_TEXT_CHARS);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Gemini embedding request timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function toPgVectorLiteral(values: number[]) {
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) return "0";
    return Number(value).toPrecision(12);
  }).join(",")}]`;
}

export async function createTextEmbedding(text: string): Promise<number[]> {
  const normalized = normalizeEmbeddingText(text);
  if (!normalized) throw new Error("Cannot create an embedding for empty text");
  if (!isGeminiConfigured()) throw new Error("GEMINI_API_KEY is not configured");

  const ai = getGeminiClient();
  const response = await withTimeout(
    ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: normalized,
      config: { outputDimensionality: EMBEDDING_DIMENSION },
    }),
    EMBEDDING_TIMEOUT_MS
  );

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Gemini returned an empty embedding");

  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${values.length}`
    );
  }

  return values;
}
