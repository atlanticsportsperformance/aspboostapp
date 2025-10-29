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

async function recreate() {
  console.log('🔄 Recreating custom_measurements table...\n');

  // Drop table
  console.log('Dropping table...');
  const { error: dropError } = await supabase
    .from('custom_measurements')
    .delete()
    .neq('id', 'xxx'); // Delete all rows first

  // Now create measurements with simplified types
  console.log('Inserting measurements with simplified types...\n');

  const measurements = [
    // Locked measurements
    {
      id: 'reps',
      name: 'Reps',
      category: 'single',
      primary_metric_id: 'reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'integer',
      is_locked: true
    },
    {
      id: 'weight',
      name: 'Weight',
      category: 'single',
      primary_metric_id: 'weight',
      primary_metric_name: 'lbs',
      primary_metric_type: 'decimal',
      is_locked: true
    },
    {
      id: 'time',
      name: 'Time',
      category: 'single',
      primary_metric_id: 'time',
      primary_metric_name: '00:00',
      primary_metric_type: 'time',
      is_locked: true
    },
    {
      id: 'distance',
      name: 'Distance',
      category: 'single',
      primary_metric_id: 'distance',
      primary_metric_name: 'ft/yds',
      primary_metric_type: 'decimal',
      is_locked: true
    },
    // Ball measurements
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

  for (const m of measurements) {
    const { error } = await supabase
      .from('custom_measurements')
      .upsert(m, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error inserting ${m.name}:`, error);
    } else {
      console.log(`✅ ${m.name}`);
    }
  }

  console.log('\n✨ Done!');
}

recreate().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
