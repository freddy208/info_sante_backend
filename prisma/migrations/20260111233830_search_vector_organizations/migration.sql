-- This is an empty migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION organizations_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.city, ''))), 'B') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.region, ''))), 'C') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.address, ''))), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_search_vector ON organizations;

CREATE TRIGGER trg_organizations_search_vector
BEFORE INSERT OR UPDATE
ON organizations
FOR EACH ROW
EXECUTE FUNCTION organizations_search_vector_update();

UPDATE organizations
SET name = name;

CREATE INDEX IF NOT EXISTS organizations_search_vector_idx
ON organizations
USING GIN (search_vector);
