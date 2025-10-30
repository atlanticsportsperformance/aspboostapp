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

async function initializeEnabledMeasurements() {
  console.log('\n🔧 Initializing enabled_measurements for all exercises with null...\n');

  // Get ALL exercises where enabled_measurements is null
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, enabled_measurements, metric_targets, exercises!inner(metric_schema)')
    .is('enabled_measurements', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises with enabled_measurements = null\n`);

  let fixedCount = 0;
  const updates = [];

  for (const ex of exercises) {
    // Get schema measurements
    const schemaMeasurements = ex.exercises?.metric_schema?.measurements || [];

    if (schemaMeasurements.length === 0) {
      console.log(`  ⚠️  Exercise ${ex.id} has no schema measurements, skipping`);
      continue;
    }

    // Initialize enabled_measurements with all schema measurement IDs
    const enabledMeasurements = schemaMeasurements.map(m => m.id);

    // Initialize metric_targets with null for any missing measurements
    const metricTargets = { ...(ex.metric_targets || {}) };
    enabledMeasurements.forEach(id => {
      if (!(id in metricTargets)) {
        metricTargets[id] = null;
      }
    });

    console.log(`  ✅ Exercise ${ex.id}: Setting enabled_measurements to [${enabledMeasurements.join(', ')}]`);

    updates.push({
      id: ex.id,
      enabled_measurements: enabledMeasurements,
      metric_targets: metricTargets
    });

    fixedCount++;
  }

  console.log(`\n📊 Found ${fixedCount} exercises to fix\n`);

  if (fixedCount === 0) {
    console.log('✅ All exercises already have enabled_measurements!');
    return;
  }

  console.log('Applying fixes...\n');

  // Update in batches
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('routine_exercises')
      .update({
        enabled_measurements: update.enabled_measurements,
        metric_targets: update.metric_targets
      })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Error updating exercise ${update.id}:`, updateError);
    } else {
      console.log(`✅ Fixed exercise ${update.id}`);
    }
  }

  console.log(`\n✅ Initialized enabled_measurements for ${fixedCount} exercises!`);
  console.log('\n🎯 All workouts now have enabled_measurements set!');
}

initializeEnabledMeasurements().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
