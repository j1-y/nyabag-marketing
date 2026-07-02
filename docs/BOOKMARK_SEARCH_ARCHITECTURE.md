# Bookmark Search Architecture

Nyabag bookmark search is an authoritative server-ranked pipeline. The client never broadens active searches with local `.includes()` scans.

## Query Lifecycle

1. `src/hooks/useBookmarks.tsx` debounces the query using `BOOKMARK_SEARCH_CONFIG.debounceMs`.
2. Stale requests are ignored with `searchRequestIdRef`.
3. The browser sends the visible query plus IANA timezone and locale.
4. `searchBookmarksByMemory()` remains the compatibility action, but delegates to `searchBookmarks()`.
5. The server parses temporal language before retrieval.
6. The server gathers lexical, semantic, and optional visual-memory candidates.
7. `src/lib/bookmark-search/fusion.ts` fuses candidates with reciprocal-rank scoring, evidence thresholds, and a final cutoff.
8. The final bookmark rows are fetched by ranked ID and returned in rank order.
9. Client polling refreshes bookmark objects by ID without reordering active search results.

## Temporal Search

Temporal search is deterministic and never asks Gemini to interpret dates. The parser lives in `src/lib/bookmark-search/temporal-query.ts` and uses the browser-supplied IANA timezone. Invalid timezone input falls back to `UTC`.

Supported phrases include:

- `today`, `yesterday`, `2 days ago`, `three days ago`, `a day ago`
- `this week`, `last week`, `two weeks ago`, `3 weeks ago`
- `past 2 weeks`, `last 14 days`
- `this month`, `last month`, `a month ago`, `two months ago`
- `past 30 days`, `past 3 months`
- `on 2026-06-10`, `on June 10, 2026`, `on 10 June 2026`, `saved June 10`
- `between June 1 and June 10`, `from June 1 to June 10`, `June 1 through June 10`
- `before June 10`, `after June 10`

Range semantics:

- `today`: start of the current local day to start of the next local day.
- `yesterday`: previous local calendar day.
- Weeks start on Monday.
- `two weeks ago`: the full calendar week two weeks before the current local week.
- `a month ago`: the full previous calendar month.
- Rolling ranges such as `past 30 days` end at the start of tomorrow in the user's local timezone.
- Date ranges are inclusive from the user perspective by using `created_at >= start` and `created_at < day_after_end`.
- Reversed ranges and invalid dates are treated as non-temporal searches.

Date-only flow:

- Example: `bookmarks I saved today`.
- Residual query is empty.
- Search directly queries `bookmarks.created_at`, newest first.
- Gemini embeddings, semantic RPCs, and visual-memory retrieval are skipped.
- Empty state uses date-specific copy such as `No bookmarks saved today`.

Mixed temporal flow:

- Example: `dark dashboards I saved today`.
- Residual query is `dark dashboards`.
- Lexical, semantic, visual-memory, and final bookmark-row retrieval all receive UTC date bounds.
- Ranking remains relevance-first among in-range candidates.
- UI shows a compact chip such as `Saved: Today`.

## Lexical Index

`bookmarks.search_vector` is a weighted PostgreSQL `tsvector` maintained by `bookmarks_search_vector_update`.

- A-weighted: title, hostname, user tags.
- B-weighted: AI patterns, AI tags, note, save reason.
- C-weighted: summary and AI description.
- D-weighted: fonts and other lower-priority extracted metadata.

`search_bookmarks_lexical(search_query, result_limit)` is retained for compatibility.
`search_bookmarks_lexical_v2(search_query, result_limit, created_after, created_before)` adds optional date bounds and uses `auth.uid()` with `SECURITY INVOKER`, RLS, weighted `ts_rank_cd`, and exact boosts for title, domain, tag, title prefix, domain prefix, title phrase, and note phrase.

## Semantic Index

`bookmark_embeddings.embedding` stays `vector(768)`. Embedding rows now include `retrieval_schema_version`.

Retrieval document schema v2 is built in `src/lib/semantic/memory-text.ts` and intentionally emphasizes:

- title and domain
- user tags and note
- save reason
- page type
- distinctive UI/layout patterns
- visual evidence
- fonts and extracted visual metadata

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

Temporal search requires no new env vars.

## Reindexing

Use service-role credentials; do not run reindexing from normal page requests.

```bash
node scripts/reindex-bookmark-search.mjs
```

The script is resume-safe by offset, skips current `content_hash`/model/schema rows, and keeps existing embeddings until replacements are written.

Temporal-search migration:

```bash
supabase db push
```

Or run `supabase/migrations/20260617_temporal_bookmark_search.sql` in the Supabase SQL editor, then reload PostgREST schema if needed:

```sql
NOTIFY pgrst, 'reload schema';
```

## Tests

```bash
node scripts/evaluate-bookmark-search.mjs
npx tsx scripts/evaluate-temporal-search.ts
npm run test
```

The fixture evaluation covers exact dominance, domain dominance, tag dominance, no padding, generic-term behavior, retrieval text, match reasons, temporal parsing, timezone/DST boundaries, and query normalization.

## RLS And Privacy

The lexical RPC uses `auth.uid()` and `SECURITY INVOKER`; bookmark rows remain protected by RLS. The reindex script requires `SUPABASE_SERVICE_ROLE_KEY` and must only be run in trusted server/operator environments.

## RAG Boundary

This system returns ranked bookmark records and concise evidence. It does not implement chat, generated summaries, Ask Nyabag, or retrieval-augmented generation.

Temporal search intentionally does not support vague phrases such as `recently`, `a while ago`, or conversational follow-ups.
