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

async function recreateTable() {
  console.log('🔄 Recreating custom_measurements table with simplified types...\n');

  // Step 1: Drop the existing table
  console.log('Step 1: Dropping existing table...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'DROP TABLE IF EXISTS custom_measurements CASCADE'
  });

  if (dropError) {
    console.error('Error dropping table:', dropError);
    return;
  }

  console.log('✅ Table dropped\n');

  // Step 2: Create table with new schema
  console.log('Step 2: Creating table with simplified type constraints...');

  const createTableSQL = `
CREATE TABLE custom_measurements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('single', 'paired')),

  -- Primary metric (used for ALL measurements)
  primary_metric_id TEXT,
  primary_metric_name TEXT,
  primary_metric_type TEXT CHECK (primary_metric_type IN ('integer', 'decimal', 'time')),

  -- Secondary metric (only for paired measurements)
  secondary_metric_id TEXT,
  secondary_metric_name TEXT,
  secondary_metric_type TEXT CHECK (secondary_metric_type IN ('integer', 'decimal', 'time')),

  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_custom_measurements_category ON custom_measurements(category);
CREATE INDEX idx_custom_measurements_locked ON custom_measurements(is_locked);

-- Enable RLS
ALTER TABLE custom_measurements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read custom measurements"
  ON custom_measurements
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create custom measurements"
  ON custom_measurements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Can delete non-locked measurements"
  ON custom_measurements
  FOR DELETE
  USING (is_locked = false);

CREATE POLICY "Can update non-locked measurements"
  ON custom_measurements
  FOR UPDATE
  USING (is_locked = false);
  `;

  const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (createError) {
    console.error('Error creating table:', createError);
    return;
  }

  console.log('✅ Table created\n');

  // Step 3: Insert locked measurements with simplified types
  console.log('Step 3: Inserting locked measurements...');

  const lockedMeasurements = [
    {
      id: 'reps',
      name: 'Reps',
      category: 'single',
      primary_metric_id: 'reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: null,
      secondary_metric_name: null,
      secondary_metric_type: null,
      is_locked: true
    },
    {
      id: 'weight',
      name: 'Weight',
      category: 'single',
      primary_metric_id: 'weight',
      primary_metric_name: 'lbs',
      primary_metric_type: 'decimal',
      secondary_metric_id: null,
      secondary_metric_name: null,
      secondary_metric_type: null,
      is_locked: true
    },
    {
      id: 'time',
      name: 'Time',
      category: 'single',
      primary_metric_id: 'time',
      primary_metric_name: '00:00',
      primary_metric_type: 'time',
      secondary_metric_id: null,
      secondary_metric_name: null,
      secondary_metric_type: null,
      is_locked: true
    },
    {
      id: 'distance',
      name: 'Distance',
      category: 'single',
      primary_metric_id: 'distance',
      primary_metric_name: 'ft/yds',
      primary_metric_type: 'decimal',
      secondary_metric_id: null,
      secondary_metric_name: null,
      secondary_metric_type: null,
      is_locked: true
    }
  ];

  for (const measurement of lockedMeasurements) {
    const { error } = await supabase
      .from('custom_measurements')
      .upsert(measurement, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting ${measurement.name}:`, error);
    } else {
      console.log(`  ✅ Inserted ${measurement.name}`);
    }
  }

  // Step 4: Insert ball measurements with simplified types
  console.log('\nStep 4: Inserting ball measurements...');

  const ballMeasurements = [
    {
      id: 'gray_ball',
      name: 'Gray Ball (100g)',
      category: 'paired',
      primary_metric_id: 'gray_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: 'gray_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal',
      is_locked: false
    },
    {
      id: 'yellow_ball',
      name: 'Yellow Ball (150g)',
      category: 'paired',
      primary_metric_id: 'yellow_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: 'yellow_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal',
      is_locked: false
    },
    {
      id: 'red_ball',
      name: 'Red Ball (225g)',
      category: 'paired',
      primary_metric_id: 'red_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: 'red_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal',
      is_locked: false
    },
    {
      id: 'blue_ball',
      name: 'Blue Ball (450g)',
      category: 'paired',
      primary_metric_id: 'blue_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: 'blue_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal',
      is_locked: false
    },
    {
      id: 'green_ball',
      name: 'Green Ball (1000g)',
      category: 'paired',
      primary_metric_id: 'green_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      secondary_metric_id: 'green_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'decimal',
      is_locked: false
    }
  ];

  for (const measurement of ballMeasurements) {
    const { error } = await supabase
      .from('custom_measurements')
      .upsert(measurement, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting ${measurement.name}:`, error);
    } else {
      console.log(`  ✅ Inserted ${measurement.name}`);
    }
  }

  console.log('\n✨ Table recreation complete!');
}

recreateTable().then(() => {
  console.log('\n👍 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
