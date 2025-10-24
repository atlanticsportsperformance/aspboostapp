import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAthleteMaxes() {
  console.log('Setting up athlete_maxes table...');

  const sql = `
-- Create athlete_maxes table for tracking personal records
CREATE TABLE IF NOT EXISTS athlete_maxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athletes(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  metric_id text NOT NULL,
  max_value decimal NOT NULL,
  reps_at_max integer,
  achieved_on date DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  verified_by_coach boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one max per athlete/exercise/metric/rep-scheme
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_maxes_unique
  ON athlete_maxes(athlete_id, exercise_id, metric_id, COALESCE(reps_at_max, 0));

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_athlete_maxes_athlete_exercise
  ON athlete_maxes(athlete_id, exercise_id);

-- RLS Policies
ALTER TABLE athlete_maxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view maxes for athletes in their org" ON athlete_maxes;
CREATE POLICY "Users can view maxes for athletes in their org"
  ON athlete_maxes
  FOR SELECT
  USING (
    athlete_id IN (
      SELECT a.id
      FROM athletes a
      WHERE a.organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage maxes for athletes in their org" ON athlete_maxes;
CREATE POLICY "Users can manage maxes for athletes in their org"
  ON athlete_maxes
  FOR ALL
  USING (
    athlete_id IN (
      SELECT a.id
      FROM athletes a
      WHERE a.organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
`;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error creating athlete_maxes table:', error);

    // Try direct query instead
    console.log('Trying alternative method...');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      const { error: stmtError } = await supabase.from('_sql').select(statement);
      if (stmtError) {
        console.error('Error executing statement:', stmtError);
      }
    }
  } else {
    console.log('✅ athlete_maxes table created successfully!');
  }

  // Check if table exists
  const { data, error: checkError } = await supabase
    .from('athlete_maxes')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ Table verification failed:', checkError);
  } else {
    console.log('✅ Table verified - athlete_maxes is ready!');
  }
}

setupAthleteMaxes().catch(console.error);
