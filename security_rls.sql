-- ============================================================================
-- Security hardening: Row Level Security
-- Voer dit EENMALIG uit in de Supabase SQL Editor.
-- Uitgangspunt: single-tenant app — elke ingelogde gebruiker mag alle data zien.
-- Niet-geauthenticeerde (anon) requests worden overal geweigerd.
-- ============================================================================

-- -- 1. Bestaande "Allow all" policies verwijderen ------------------------------
DROP POLICY IF EXISTS "Allow all on pipeline_stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Allow all on lead_activities" ON lead_activities;
DROP POLICY IF EXISTS "Allow all on lead_attachments" ON lead_attachments;

-- -- 2. RLS inschakelen op alle data-tabellen ----------------------------------
ALTER TABLE posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_analytics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attachments    ENABLE ROW LEVEL SECURITY;

-- linkedin_posts wordt door sommige routes gebruikt maar heeft geen CREATE-statement
-- in de schemas. Maak 'em aan als ze nog niet bestaat, en zet RLS aan.
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text UNIQUE NOT NULL,
  post_title text,
  post_type text,
  content_type text,
  published_date date,
  audience text,
  views integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr numeric,
  reactions integer DEFAULT 0,
  comments integer DEFAULT 0,
  reposts integer DEFAULT 0,
  follows integer DEFAULT 0,
  engagement_rate numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;

-- -- 3. Policies: alleen authenticated mag lezen/schrijven ---------------------
-- Herhaalbaar: eerst droppen, dan aanmaken.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'posts', 'leads', 'linkedin_analytics', 'chat_history',
    'pipeline_stages', 'lead_activities', 'lead_attachments', 'linkedin_posts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%1$s" ON %1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%1$s" ON %1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%1$s" ON %1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%1$s" ON %1$I', t);

    EXECUTE format(
      'CREATE POLICY "authenticated_select_%1$s" ON %1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_insert_%1$s" ON %1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_update_%1$s" ON %1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_delete_%1$s" ON %1$I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END
$$;

-- -- 4. Storage bucket policies (lead-attachments) -----------------------------
-- Zet de bucket op "public: false" als je de bestanden ook achter auth wil zetten.
-- Voor nu: alleen authenticated mag uploaden/verwijderen; read blijft via publicUrl.

DROP POLICY IF EXISTS "lead_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "lead_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "lead_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "lead_attachments_select" ON storage.objects;

CREATE POLICY "lead_attachments_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lead-attachments');

CREATE POLICY "lead_attachments_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "lead_attachments_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lead-attachments')
  WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "lead_attachments_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lead-attachments');

-- -- 5. Resultaat verifiëren ---------------------------------------------------
-- Controle-query (optioneel):
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT schemaname, tablename, policyname, roles FROM pg_policies
--     WHERE schemaname='public' ORDER BY tablename;
