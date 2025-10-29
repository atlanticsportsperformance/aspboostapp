const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applySchemaUpdate() {
  console.log('🔄 Applying schema update...\n');

  // Step 1: Delete all current data
  console.log('Step 1: Clearing existing measurements...');
  const { error: deleteError } = await supabase
    .from('custom_measurements')
    .delete()
    .neq('id', 'impossible_id_that_doesnt_exist');

  if (deleteError) {
    console.error('Error deleting:', deleteError);
  } else {
    console.log('✅ Cleared\n');
  }

  // Step 2: Now you need to manually run the SQL in Supabase SQL Editor
  console.log('⚠️  MANUAL STEP REQUIRED:');
  console.log('=======================\n');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project');
  console.log('2. Go to SQL Editor');
  console.log('3. Copy and paste this SQL:\n');

  console.log(`
-- Drop the existing table
DROP TABLE IF EXISTS custom_measurements CASCADE;

-- Create table with simplified types
CREATE TABLE custom_measurements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('single', 'paired')),

  primary_metric_id TEXT,
  primary_metric_name TEXT,
  primary_metric_type TEXT CHECK (primary_metric_type IN ('integer', 'decimal', 'time')),

  secondary_metric_id TEXT,
  secondary_metric_name TEXT,
  secondary_metric_type TEXT CHECK (secondary_metric_type IN ('integer', 'decimal', 'time')),

  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_custom_measurements_category ON custom_measurements(category);
CREATE INDEX idx_custom_measurements_locked ON custom_measurements(is_locked);

ALTER TABLE custom_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom measurements"
  ON custom_measurements FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create custom measurements"
  ON custom_measurements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Can delete non-locked measurements"
  ON custom_measurements FOR DELETE USING (is_locked = false);

CREATE POLICY "Can update non-locked measurements"
  ON custom_measurements FOR UPDATE USING (is_locked = false);
`);

  console.log('\n4. Run the SQL');
  console.log('5. Then run: npx tsx scripts/run-recreate-sql.ts');
  console.log('\n=======================\n');
}

applySchemaUpdate().then(() => {
  console.log('👍 Instructions displayed!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
