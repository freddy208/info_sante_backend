-- ============================ 
-- EXTENSIONS
-- ============================ 
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================ 
-- FONCTION WRAPPER IMMUTABLE
-- ============================ 
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT unaccent($1)
$func$;

-- ============================ 
-- ANNOUNCEMENTS
-- ============================ 
ALTER TABLE announcements 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector(
    'french',
    immutable_unaccent(coalesce(title, '') || ' ' || coalesce(content, ''))
  )
) STORED;

CREATE INDEX idx_announcements_search ON announcements USING GIN (search_vector);

-- ============================ 
-- ARTICLES
-- ============================ 
ALTER TABLE articles 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector(
    'french',
    immutable_unaccent(coalesce(title, '') || ' ' || coalesce(content, ''))
  )
) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- ============================ 
-- ORGANIZATIONS
-- ============================ 
ALTER TABLE organizations 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector(
    'french',
    immutable_unaccent(coalesce(name, '') || ' ' || coalesce(city, ''))
  )
) STORED;

CREATE INDEX idx_organizations_search ON organizations USING GIN (search_vector);