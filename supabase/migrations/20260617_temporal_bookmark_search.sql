-- Phase 1 temporal bookmark search: date-bound candidate retrieval.

CREATE INDEX IF NOT EXISTS bookmarks_user_created_at_idx
  ON bookmarks(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION search_bookmarks_lexical_v2(
  search_query TEXT,
  result_limit INTEGER DEFAULT 40,
  created_after TIMESTAMPTZ DEFAULT NULL,
  created_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  bookmark_id UUID,
  lexical_score DOUBLE PRECISION,
  exact_match_score DOUBLE PRECISION,
  rank INTEGER,
  match_reasons TEXT[]
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  WITH q AS (
    SELECT
      trim(regexp_replace(coalesce(search_query, ''), '\s+', ' ', 'g')) AS raw_query,
      lower(trim(regexp_replace(coalesce(search_query, ''), '\s+', ' ', 'g'))) AS normalized_query,
      websearch_to_tsquery('english', trim(regexp_replace(coalesce(search_query, ''), '\s+', ' ', 'g'))) AS ts_query
  ),
  scored AS (
    SELECT
      b.id AS bookmark_id,
      ts_rank_cd(b.search_vector, q.ts_query, 32) AS text_rank,
      q.normalized_query,
      LEAST(1.0,
        (CASE WHEN lower(b.title) = q.normalized_query THEN 1.0 ELSE 0.0 END) +
        (CASE WHEN bookmark_hostname(b.url) = q.normalized_query THEN 0.95 ELSE 0.0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM unnest(b.tags) tag WHERE lower(tag) = q.normalized_query) THEN 0.9 ELSE 0.0 END) +
        (CASE WHEN lower(b.title) LIKE q.normalized_query || '%' THEN 0.35 ELSE 0.0 END) +
        (CASE WHEN bookmark_hostname(b.url) LIKE q.normalized_query || '%' THEN 0.3 ELSE 0.0 END) +
        (CASE WHEN lower(b.title) LIKE '%' || q.normalized_query || '%' THEN 0.25 ELSE 0.0 END) +
        (CASE WHEN lower(b.note) LIKE '%' || q.normalized_query || '%' THEN 0.2 ELSE 0.0 END)
      ) AS exact_score,
      array_remove(ARRAY[
        CASE WHEN lower(b.title) = q.normalized_query THEN 'Exact title' END,
        CASE WHEN bookmark_hostname(b.url) = q.normalized_query THEN 'Exact domain' END,
        CASE WHEN EXISTS (SELECT 1 FROM unnest(b.tags) tag WHERE lower(tag) = q.normalized_query) THEN 'Exact tag' END,
        CASE WHEN lower(b.title) LIKE q.normalized_query || '%' THEN 'Title prefix' END,
        CASE WHEN bookmark_hostname(b.url) LIKE q.normalized_query || '%' THEN 'Domain prefix' END,
        CASE WHEN ts_rank_cd(b.search_vector, q.ts_query, 32) > 0 THEN 'Keyword evidence' END,
        CASE WHEN lower(b.note) LIKE '%' || q.normalized_query || '%' THEN 'Note phrase' END
      ], NULL) AS reasons
    FROM bookmarks b
    CROSS JOIN q
    WHERE b.user_id = auth.uid()
      AND q.raw_query <> ''
      AND (created_after IS NULL OR b.created_at >= created_after)
      AND (created_before IS NULL OR b.created_at < created_before)
      AND (
        b.search_vector @@ q.ts_query
        OR lower(b.title) LIKE '%' || q.normalized_query || '%'
        OR bookmark_hostname(b.url) LIKE '%' || q.normalized_query || '%'
        OR lower(b.note) LIKE '%' || q.normalized_query || '%'
        OR EXISTS (SELECT 1 FROM unnest(b.tags) tag WHERE lower(tag) LIKE '%' || q.normalized_query || '%')
      )
  ),
  ranked AS (
    SELECT
      bookmark_id,
      LEAST(1.0, text_rank + exact_score) AS lexical_score,
      exact_score AS exact_match_score,
      reasons AS match_reasons,
      row_number() OVER (ORDER BY exact_score DESC, text_rank DESC, bookmark_id) AS result_rank
    FROM scored
  )
  SELECT
    bookmark_id,
    lexical_score,
    exact_match_score,
    result_rank::INTEGER - 1 AS rank,
    match_reasons
  FROM ranked
  ORDER BY result_rank
  LIMIT LEAST(GREATEST(result_limit, 1), 80);
$$;

CREATE OR REPLACE FUNCTION match_bookmarks_by_embedding_v2(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 24,
  similarity_threshold FLOAT DEFAULT 0.2,
  minimum_schema_version INT DEFAULT 1,
  created_after TIMESTAMPTZ DEFAULT NULL,
  created_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  bookmark_id UUID,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    be.bookmark_id,
    1 - (be.embedding <=> query_embedding) AS similarity
  FROM bookmark_embeddings be
  JOIN bookmarks b ON b.id = be.bookmark_id
  WHERE be.user_id = match_user_id
    AND b.user_id = match_user_id
    AND be.retrieval_schema_version >= minimum_schema_version
    AND (created_after IS NULL OR b.created_at >= created_after)
    AND (created_before IS NULL OR b.created_at < created_before)
    AND 1 - (be.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY be.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

CREATE OR REPLACE FUNCTION match_bookmark_memory_chunks_v2(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 40,
  similarity_threshold FLOAT DEFAULT 0.2,
  created_after TIMESTAMPTZ DEFAULT NULL,
  created_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  bookmark_id UUID,
  chunk_id UUID,
  chunk_type TEXT,
  chunk_label TEXT,
  similarity FLOAT,
  evidence JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    bmc.bookmark_id,
    bmc.id AS chunk_id,
    bmc.chunk_type,
    bmc.chunk_label,
    1 - (bmc.embedding <=> query_embedding) AS similarity,
    bmc.evidence
  FROM bookmark_memory_chunks bmc
  JOIN bookmarks b ON b.id = bmc.bookmark_id
  WHERE bmc.user_id = match_user_id
    AND b.user_id = match_user_id
    AND bmc.embedding IS NOT NULL
    AND (created_after IS NULL OR b.created_at >= created_after)
    AND (created_before IS NULL OR b.created_at < created_before)
    AND 1 - (bmc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY bmc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 100);
$$;

CREATE OR REPLACE FUNCTION search_bookmark_memory_chunks_text_v2(
  query_text TEXT,
  match_user_id UUID,
  match_count INT DEFAULT 40,
  created_after TIMESTAMPTZ DEFAULT NULL,
  created_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  bookmark_id UUID,
  chunk_id UUID,
  chunk_type TEXT,
  chunk_label TEXT,
  rank FLOAT,
  evidence JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    bmc.bookmark_id,
    bmc.id AS chunk_id,
    bmc.chunk_type,
    bmc.chunk_label,
    ts_rank_cd(to_tsvector('english', bmc.chunk_text), plainto_tsquery('english', query_text)) AS rank,
    bmc.evidence
  FROM bookmark_memory_chunks bmc
  JOIN bookmarks b ON b.id = bmc.bookmark_id
  WHERE bmc.user_id = match_user_id
    AND b.user_id = match_user_id
    AND query_text IS NOT NULL
    AND char_length(trim(query_text)) > 0
    AND (created_after IS NULL OR b.created_at >= created_after)
    AND (created_before IS NULL OR b.created_at < created_before)
    AND to_tsvector('english', bmc.chunk_text) @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT LEAST(GREATEST(match_count, 1), 100);
$$;
