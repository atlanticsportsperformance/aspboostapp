-- Migration: Create athlete view types system
-- This allows admins to categorize athletes and customize their experience

-- Create athlete_view_types table
CREATE TABLE IF NOT EXISTS athlete_view_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_view_type_per_org UNIQUE(org_id, name)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_athlete_view_types_org ON athlete_view_types(org_id);
CREATE INDEX IF NOT EXISTS idx_athlete_view_types_active ON athlete_view_types(is_active);

-- Add view_type_id column to athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS view_type_id UUID REFERENCES athlete_view_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_view_type ON athletes(view_type_id);

-- Enable RLS
ALTER TABLE athlete_view_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read view types from their org" ON athlete_view_types;
CREATE POLICY "Users can read view types from their org"
ON athlete_view_types FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage view types" ON athlete_view_types;
CREATE POLICY "Admins can manage view types"
ON athlete_view_types FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM profiles
    WHERE id = auth.uid()
    AND app_role = 'admin'
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM profiles
    WHERE id = auth.uid()
    AND app_role = 'admin'
  )
);

-- Insert default view types for each organization
INSERT INTO athlete_view_types (name, description, display_order, org_id, is_active)
SELECT
  name,
  description,
  display_order,
  o.id as org_id,
  true
FROM (VALUES
  ('Two Way Performance', 'Athletes training for both hitting and pitching', 1),
  ('Hitting Performance', 'Athletes focused on hitting development', 2),
  ('Pitching Performance', 'Athletes focused on pitching development', 3),
  ('Athlete Strength + Conditioning', 'General strength and conditioning athletes', 4)
) AS view_types(name, description, display_order)
CROSS JOIN organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM athlete_view_types avt
  WHERE avt.org_id = o.id
)
ON CONFLICT (org_id, name) DO NOTHING;
