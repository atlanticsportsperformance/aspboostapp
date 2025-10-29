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

async function migrate() {
  console.log('🚀 Starting migration to custom_measurements table...\n');

  // Step 1: Insert locked measurements
  console.log('Step 1: Inserting locked measurements...');

  const lockedMeasurements = [
    {
      id: 'reps',
      name: 'Reps',
      category: 'single',
      primary_metric_id: 'reps',
      primary_metric_name: 'Reps',
      primary_metric_type: 'reps',
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
      primary_metric_type: 'weight',
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
      primary_metric_type: 'distance',
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
      console.error(`  ❌ Failed to insert ${measurement.name}:`, error);
    } else {
      console.log(`  ✅ Inserted locked measurement: ${measurement.name}`);
    }
  }

  // Step 2: Find all system exercises with measurements
  console.log('\nStep 2: Finding system exercises with measurements...');

  const { data: systemExercises, error: fetchError } = await supabase
    .from('exercises')
    .select('id, name, metric_schema, tags')
    .contains('tags', ['_system'])
    .eq('is_active', true);

  if (fetchError) {
    console.error('❌ Error fetching system exercises:', fetchError);
    return;
  }

  console.log(`  Found ${systemExercises?.length || 0} system exercises`);

  // Step 3: Extract unique measurements from system exercises
  console.log('\nStep 3: Extracting measurements from system exercises...');

  const measurementsMap = new Map();

  systemExercises?.forEach(ex => {
    const measurements = ex.metric_schema?.measurements || [];
    measurements.forEach((m: any) => {
      if (!measurementsMap.has(m.id) && !lockedMeasurements.find(lm => lm.id === m.id)) {
        measurementsMap.set(m.id, {
          id: m.id,
          name: m.name,
          category: 'single',
          primary_metric_id: m.id,
          primary_metric_name: m.unit || m.name,
          primary_metric_type: m.type || 'performance_decimal',
          secondary_metric_id: null,
          secondary_metric_name: null,
          secondary_metric_type: null,
          is_locked: false
        });
      }
    });
  });

  console.log(`  Found ${measurementsMap.size} unique custom measurements`);

  // Step 4: Insert custom measurements
  console.log('\nStep 4: Inserting custom measurements...');

  for (const [id, measurement] of measurementsMap.entries()) {
    const { error } = await supabase
      .from('custom_measurements')
      .upsert(measurement, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Failed to insert ${measurement.name}:`, error);
    } else {
      console.log(`  ✅ Inserted custom measurement: ${measurement.name}`);
    }
  }

  // Step 5: Delete system exercises
  console.log('\nStep 5: Cleaning up system exercises...');

  if (systemExercises && systemExercises.length > 0) {
    const systemExerciseIds = systemExercises.map(ex => ex.id);

    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .in('id', systemExerciseIds);

    if (deleteError) {
      console.error('  ❌ Error deleting system exercises:', deleteError);
    } else {
      console.log(`  ✅ Deleted ${systemExerciseIds.length} system exercises`);
    }
  }

  console.log('\n✨ Migration complete!');
  console.log('\nSummary:');
  console.log(`  - Locked measurements: ${lockedMeasurements.length}`);
  console.log(`  - Custom measurements: ${measurementsMap.size}`);
  console.log(`  - System exercises cleaned: ${systemExercises?.length || 0}`);
}

migrate()
  .then(() => {
    console.log('\n👍 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  });
