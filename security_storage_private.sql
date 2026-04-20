-- ============================================================================
-- Storage hardening stap 2: bucket privé maken + data-migratie
-- Voer dit PAS uit nadat je de bijbehorende code-wijzigingen gedeployed hebt.
-- (LeadDetailPanel + LeadCard moeten signed URLs ondersteunen.)
-- ============================================================================

-- -- 1. Oude "Allow all" anon-policies op storage.objects verwijderen ----------
-- Deze stonden iedereen (ook niet-ingelogd) toe om bestanden te zien/wijzigen.
DROP POLICY IF EXISTS "Allow all 12pft8f_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow all 12pft8f_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow all 12pft8f_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow all 12pft8f_3" ON storage.objects;

-- -- 2. Nieuwe kolommen met het opslag-PAD (i.p.v. publieke URL) --------------
ALTER TABLE lead_attachments
  ADD COLUMN IF NOT EXISTS file_path text;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS cover_image_path text;

-- -- 3. Bestaande rijen migreren: haal het pad uit de publieke URL -----------
UPDATE lead_attachments
SET file_path = regexp_replace(
      file_url,
      '^.*/storage/v1/object/public/lead-attachments/',
      ''
    )
WHERE file_path IS NULL
  AND file_url LIKE '%/storage/v1/object/public/lead-attachments/%';

UPDATE leads
SET cover_image_path = regexp_replace(
      cover_image_url,
      '^.*/storage/v1/object/public/lead-attachments/',
      ''
    )
WHERE cover_image_path IS NULL
  AND cover_image_url IS NOT NULL
  AND cover_image_url LIKE '%/storage/v1/object/public/lead-attachments/%';

-- -- 4. Controleer dat alles is gevuld ----------------------------------------
-- Optioneel: run onderstaande queries en check of alle rijen nu een file_path hebben.
--   SELECT count(*) AS zonder_pad FROM lead_attachments WHERE file_path IS NULL;
--   SELECT count(*) AS zonder_cover_pad FROM leads
--     WHERE cover_image_url IS NOT NULL AND cover_image_path IS NULL;

-- -- 5. Bucket privé maken ----------------------------------------------------
-- Doe dit via het dashboard (Storage → lead-attachments → Edit bucket → Public uit)
-- OF run dit:
UPDATE storage.buckets SET public = false WHERE id = 'lead-attachments';
