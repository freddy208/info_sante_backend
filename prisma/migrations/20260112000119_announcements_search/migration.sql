-- This is an empty migration.
-- ================================
-- FULL TEXT SEARCH – ANNOUNCEMENTS
-- ================================

-- Extension utile (déjà ok si existante)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2️⃣ Fonction de mise à jour
CREATE OR REPLACE FUNCTION announcements_search_vector_update()
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
DROP TRIGGER IF EXISTS trg_announcements_search_vector ON announcements;

CREATE TRIGGER trg_announcements_search_vector
BEFORE INSERT OR UPDATE
ON announcements
FOR EACH ROW
EXECUTE FUNCTION announcements_search_vector_update();

-- 4️⃣ Recalculer les données existantes
UPDATE announcements
SET title = title;

-- 5️⃣ Index GIN
CREATE INDEX IF NOT EXISTS announcements_search_vector_idx
ON announcements
USING GIN (search_vector);
