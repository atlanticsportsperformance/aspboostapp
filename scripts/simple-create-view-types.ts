import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createViewTypesSystem() {
  console.log('🚀 Creating athlete view types system...\n');

  // For now, let's store view types in a simple JSON config
  // We'll ask the user to manually add the athlete_view_types table via Supabase dashboard

  console.log('📋 Manual SQL to run in Supabase SQL Editor:\n');
  console.log('----------------------------------------\n');

  const sql = `
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
    AND app_role IN ('admin', 'owner')
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM profiles
    WHERE id = auth.uid()
    AND app_role IN ('admin', 'owner')
  )
);
`;

  console.log(sql);
  console.log('\n----------------------------------------\n');

  console.log('📌 After running the above SQL in Supabase, run:');
  console.log('   npx tsx scripts/seed-view-types.ts\n');
}

createViewTypesSystem().catch(console.error);
