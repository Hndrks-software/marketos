-- LinkedIn Analytics schema uitbreiden voor alle 3 exportbestanden
-- Voer dit uit in de Supabase SQL Editor

-- Nieuwe kolommen toevoegen (worden genegeerd als ze al bestaan)
ALTER TABLE linkedin_analytics
  ADD COLUMN IF NOT EXISTS engagement_rate decimal,
  ADD COLUMN IF NOT EXISTS new_followers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_followers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_visitors integer DEFAULT 0;

-- Unieke constraint op datum zodat upsert werkt (overschrijven bij overlap)
ALTER TABLE linkedin_analytics
  DROP CONSTRAINT IF EXISTS linkedin_analytics_date_unique;

ALTER TABLE linkedin_analytics
  ADD CONSTRAINT linkedin_analytics_date_unique UNIQUE (date);
