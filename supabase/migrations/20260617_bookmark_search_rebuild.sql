-- Rebuild bookmark search around ranked lexical retrieval plus schema-versioned embeddings.

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE INDEX IF NOT EXISTS idx_bookmarks_search_vector ON bookmarks USING GIN(search_vector);

CREATE OR REPLACE FUNCTION bookmark_hostname(bookmark_url TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT lower(split_part(regexp_replace(coalesce(bookmark_url, ''), '^https?://(www\.)?', '', 'i'), '/', 1));
$$;

CREATE OR REPLACE FUNCTION build_bookmark_search_vector(
  bookmark_title TEXT,
  bookmark_url TEXT,
  bookmark_tags TEXT[],
  bookmark_summary TEXT,
  bookmark_note TEXT,
  bookmark_save_reason TEXT,
  bookmark_ai_description TEXT,
  bookmark_ai_tags TEXT[],
  bookmark_ai_patterns TEXT[],
  bookmark_fonts TEXT[],
  bookmark_ai_design_dna JSONB
)
RETURNS TSVECTOR
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(bookmark_title, '')), 'A') ||
    setweight(to_tsvector('english', bookmark_hostname(bookmark_url)), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(bookmark_tags, '{}'), ' ')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(bookmark_ai_patterns, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(bookmark_ai_tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(bookmark_note, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bookmark_save_reason, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bookmark_summary, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(bookmark_ai_description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(bookmark_fonts, '{}'), ' ')), 'D') ||
    setweight(to_tsvector('english', coalesce(bookmark_ai_design_dna::text, '')), 'D');
$$;

CREATE OR REPLACE FUNCTION update_bookmark_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector = build_bookmark_search_vector(
    NEW.title,
    NEW.url,
    NEW.tags,
    NEW.summary,
    NEW.note,
    NEW.save_reason,
    NEW.ai_description,
    NEW.ai_tags,
    NEW.ai_patterns,
    NEW.fonts,
    NEW.ai_design_dna
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookmarks_search_vector_update ON bookmarks;
CREATE TRIGGER bookmarks_search_vector_update
  BEFORE INSERT OR UPDATE OF title, url, tags, summary, note, save_reason, ai_description, ai_tags, ai_patterns, fonts, ai_design_dna ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_search_vector();

UPDATE bookmarks
SET search_vector = build_bookmark_search_vector(
  title,
  url,
  tags,
  summary,
  note,
  save_reason,
  ai_description,
  ai_tags,
  ai_patterns,
  fonts,
  ai_design_dna
)
WHERE search_vector IS NULL;

CREATE OR REPLACE FUNCTION search_bookmarks_lexical(
  search_query TEXT,
  result_limit INTEGER DEFAULT 40
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

ALTER TABLE bookmark_embeddings
  ADD COLUMN IF NOT EXISTS retrieval_schema_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE bookmark_embeddings
  DROP CONSTRAINT IF EXISTS bookmark_embeddings_retrieval_schema_version_check,
  ADD CONSTRAINT bookmark_embeddings_retrieval_schema_version_check CHECK (retrieval_schema_version >= 1);

CREATE OR REPLACE FUNCTION match_bookmarks_by_embedding(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 24,
  similarity_threshold FLOAT DEFAULT 0.2,
  minimum_schema_version INT DEFAULT 1
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
  WHERE be.user_id = match_user_id
    AND be.retrieval_schema_version >= minimum_schema_version
    AND 1 - (be.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY be.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;
