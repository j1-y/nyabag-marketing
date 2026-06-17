# Bookmark Search Architecture

Nyabag bookmark search is an authoritative server-ranked pipeline. The client never broadens active searches with local `.includes()` scans.

## Query Lifecycle

1. `src/hooks/useBookmarks.tsx` debounces the query using `BOOKMARK_SEARCH_CONFIG.debounceMs`.
2. Stale requests are ignored with `searchRequestIdRef`.
3. `searchBookmarksByMemory()` remains the compatibility action, but delegates to `searchBookmarks()`.
4. The server gathers lexical, semantic, and optional visual-memory candidates.
5. `src/lib/bookmark-search/fusion.ts` fuses candidates with reciprocal-rank scoring, evidence thresholds, and a final cutoff.
6. The final bookmark rows are fetched by ranked ID and returned in rank order.
7. Client polling refreshes bookmark objects by ID without reordering active search results.

## Lexical Index

`bookmarks.search_vector` is a weighted PostgreSQL `tsvector` maintained by `bookmarks_search_vector_update`.

- A-weighted: title, hostname, user tags.
- B-weighted: AI patterns, AI tags, note, save reason.
- C-weighted: summary and AI description.
- D-weighted: fonts and compact Design DNA JSON.

`search_bookmarks_lexical(search_query, result_limit)` uses `auth.uid()` with `SECURITY INVOKER`, RLS, weighted `ts_rank_cd`, and exact boosts for title, domain, tag, title prefix, domain prefix, title phrase, and note phrase.

## Semantic Index

`bookmark_embeddings.embedding` stays `vector(768)`. Embedding rows now include `retrieval_schema_version`.

Retrieval document schema v2 is built in `src/lib/semantic/memory-text.ts` and intentionally emphasizes:

- title and domain
- user tags and note
- save reason
- page type
- distinctive UI/layout patterns
- visual evidence
- selected Design DNA

The document avoids full URLs, repeated generic AI tags, duplicated raw JSON, and HEX-heavy palettes.

## Fusion And Cutoff

`src/lib/bookmark-search/fusion.ts` is pure TypeScript and testable without Supabase. It combines:

- lexical rank and score
- exact-match score
- semantic similarity
- optional visual-memory score
- concise evidence reasons

The final result limit defaults to 12. Lexical and semantic candidate pools default to 40.

## Config

Central config lives in `src/lib/bookmark-search/config.ts`.

Operational env:

- `GEMINI_API_KEY`: required for semantic query/document embeddings.
- `GEMINI_EMBEDDING_MODEL`: defaults to `gemini-embedding-2`.
- `VISUAL_MEMORY_SEARCH_ENABLED`: disables optional visual candidates when set to `false`.
- `NYABAG_SEARCH_DEBUG=1`: includes candidate-count diagnostics in the server payload.
- `SEARCH_REINDEX_BATCH_SIZE`, `SEARCH_REINDEX_OFFSET`, `SEARCH_REINDEX_DRY_RUN`: control the reindex script.

## Reindexing

Use service-role credentials; do not run reindexing from normal page requests.

```bash
node scripts/reindex-bookmark-search.mjs
```

The script is resume-safe by offset, skips current `content_hash`/model/schema rows, and keeps existing embeddings until replacements are written.

## Tests

```bash
node scripts/evaluate-bookmark-search.mjs
npm run test
```

The fixture evaluation covers exact dominance, domain dominance, tag dominance, no padding, generic-term behavior, retrieval text, match reasons, and query normalization.

## RLS And Privacy

The lexical RPC uses `auth.uid()` and `SECURITY INVOKER`; bookmark rows remain protected by RLS. The reindex script requires `SUPABASE_SERVICE_ROLE_KEY` and must only be run in trusted server/operator environments.

## RAG Boundary

This system returns ranked bookmark records and concise evidence. It does not implement chat, generated summaries, Ask Nyabag, or retrieval-augmented generation.
