-- This is an empty migration.

-- =========================
-- FULL TEXT SEARCH – ARTICLES
-- =========================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;


-- 2️⃣ Fonction
CREATE OR REPLACE FUNCTION articles_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.excerpt, ''))), 'B') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.content, ''))), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3️⃣ Trigger
DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;

CREATE TRIGGER trg_articles_search_vector
BEFORE INSERT OR UPDATE
ON articles
FOR EACH ROW
EXECUTE FUNCTION articles_search_vector_update();

-- 4️⃣ Rebuild data
UPDATE articles
SET title = title;

-- 5️⃣ Index
CREATE INDEX IF NOT EXISTS articles_search_vector_idx
ON articles
USING GIN (search_vector);
