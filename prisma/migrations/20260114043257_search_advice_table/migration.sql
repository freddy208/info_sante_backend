-- AlterTable
ALTER TABLE "advices" ADD COLUMN     "search_vector" tsvector;

-- =========================
-- FULL TEXT SEARCH – ADVICES
-- =========================

-- 1️⃣ Extensions (Utile si pas déjà installé)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;


-- 2️⃣ Fonction de mise à jour du vecteur (Adaptée pour Advice : pas d'excerpt)
CREATE OR REPLACE FUNCTION advices_search_vector_update()
RETURNS trigger AS $$ BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('french', unaccent(coalesce(NEW.content, ''))), 'B');
  RETURN NEW;
END
 $$ LANGUAGE plpgsql;


-- 3️⃣ Trigger
DROP TRIGGER IF EXISTS trg_advices_search_vector ON advices;

CREATE TRIGGER trg_advices_search_vector
BEFORE INSERT OR UPDATE
ON advices
FOR EACH ROW
EXECUTE FUNCTION advices_search_vector_update();


-- 4️⃣ Reconstruction des vecteurs (Important pour les données existantes)
-- On force une mise à jour pour remplir la colonne search_vector
UPDATE advices
SET title = title;


-- 5️⃣ Index GIN pour la recherche
CREATE INDEX IF NOT EXISTS advices_search_vector_idx
ON advices
USING GIN (search_vector);
