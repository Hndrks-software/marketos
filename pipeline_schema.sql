-- ============================================
-- Sales Pipeline Schema Migration
-- Run dit in Supabase SQL Editor
-- ============================================

-- 1. Pipeline Stages tabel
CREATE TABLE pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Default stages
INSERT INTO pipeline_stages (name, position, color) VALUES
  ('Nieuw Lead', 0, '#3b82f6'),
  ('Contact gelegd', 1, '#8b5cf6'),
  ('Offerte verstuurd', 2, '#f97316'),
  ('Onderhandeling', 3, '#eab308'),
  ('Gewonnen', 4, '#10b981'),
  ('Verloren', 5, '#ef4444');

-- RLS voor pipeline_stages
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on pipeline_stages" ON pipeline_stages FOR ALL USING (true);

-- 2. Leads tabel uitbreiden met pipeline velden
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES pipeline_stages(id),
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Bestaande leads koppelen aan stages
UPDATE leads SET stage_id = (SELECT id FROM pipeline_stages WHERE name = 'Nieuw Lead') WHERE status = 'new' AND stage_id IS NULL;
UPDATE leads SET stage_id = (SELECT id FROM pipeline_stages WHERE name = 'Contact gelegd') WHERE status = 'qualified' AND stage_id IS NULL;
UPDATE leads SET stage_id = (SELECT id FROM pipeline_stages WHERE name = 'Gewonnen') WHERE status = 'won' AND stage_id IS NULL;
UPDATE leads SET stage_id = (SELECT id FROM pipeline_stages WHERE name = 'Verloren') WHERE status = 'lost' AND stage_id IS NULL;

-- 3. Lead Activities tabel (activiteiten log)
CREATE TABLE lead_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'status_change')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS voor lead_activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on lead_activities" ON lead_activities FOR ALL USING (true);
