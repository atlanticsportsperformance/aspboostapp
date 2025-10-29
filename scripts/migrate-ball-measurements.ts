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

async function migrateBallMeasurements() {
  console.log('🏐 Migrating ball measurements as paired metrics...\n');

  // Define ball measurements as paired metrics
  const ballMeasurements = [
    {
      id: 'gray_ball',
      name: 'Gray Ball (100g)',
      category: 'paired',
      primary_metric_id: 'gray_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
      secondary_metric_id: 'gray_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'performance_decimal',
      is_locked: false
    },
    {
      id: 'yellow_ball',
      name: 'Yellow Ball (150g)',
      category: 'paired',
      primary_metric_id: 'yellow_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
      secondary_metric_id: 'yellow_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'performance_decimal',
      is_locked: false
    },
    {
      id: 'red_ball',
      name: 'Red Ball (225g)',
      category: 'paired',
      primary_metric_id: 'red_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
      secondary_metric_id: 'red_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'performance_decimal',
      is_locked: false
    },
    {
      id: 'blue_ball',
      name: 'Blue Ball (450g)',
      category: 'paired',
      primary_metric_id: 'blue_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
      secondary_metric_id: 'blue_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'performance_decimal',
      is_locked: false
    },
    {
      id: 'green_ball',
      name: 'Green Ball (1000g)',
      category: 'paired',
      primary_metric_id: 'green_ball_reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
      secondary_metric_id: 'green_ball_velo',
      secondary_metric_name: 'MPH',
      secondary_metric_type: 'performance_decimal',
      is_locked: false
    }
  ];

  console.log('Step 1: Inserting paired ball measurements...');

  for (const measurement of ballMeasurements) {
    const { error } = await supabase
      .from('custom_measurements')
      .upsert(measurement, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Failed to insert ${measurement.name}:`, error);
    } else {
      console.log(`  ✅ Inserted paired measurement: ${measurement.name}`);
    }
  }

  console.log('\n✨ Ball measurements migration complete!');
}

migrateBallMeasurements()
  .then(() => {
    console.log('\n👍 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  });
