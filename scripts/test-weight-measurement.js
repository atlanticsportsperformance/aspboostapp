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

async function testWeightMeasurement() {
  console.log('\n🔍 Testing weight measurement with null value...\n');

  // Find a routine exercise with weight enabled but no target
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select(`
      id,
      exercise_id,
      enabled_measurements,
      metric_targets,
      routines!inner(
        name,
        workouts!inner(
          name,
          athlete_id
        )
      ),
      exercises(name)
    `)
    .contains('enabled_measurements', ['weight'])
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (exercises.length === 0) {
    console.log('No exercises found with weight enabled');
    return;
  }

  const exercise = exercises[0];
  console.log('Found exercise:');
  console.log(`  Exercise: ${exercise.exercises?.name}`);
  console.log(`  Routine: ${exercise.routines?.name}`);
  console.log(`  Workout: ${exercise.routines?.workouts[0]?.name}`);
  console.log(`  enabled_measurements:`, exercise.enabled_measurements);
  console.log(`  metric_targets:`, exercise.metric_targets);

  // Check if weight is in metric_targets
  const hasWeight = exercise.metric_targets && 'weight' in exercise.metric_targets;
  console.log(`\n  Has 'weight' key in metric_targets: ${hasWeight}`);
  if (hasWeight) {
    console.log(`  Weight value: ${exercise.metric_targets.weight}`);
  }

  // Test update: Add weight: null to metric_targets
  console.log(`\n\n📝 Testing update: Adding weight: null to metric_targets...`);

  const updatedTargets = {
    ...exercise.metric_targets,
    weight: null
  };

  console.log('  New metric_targets:', updatedTargets);

  const { error: updateError } = await supabase
    .from('routine_exercises')
    .update({ metric_targets: updatedTargets })
    .eq('id', exercise.id);

  if (updateError) {
    console.error('  ❌ Update error:', updateError);
    return;
  }

  console.log('  ✅ Update successful');

  // Read it back
  console.log('\n🔄 Reading back from database...');

  const { data: updated, error: readError } = await supabase
    .from('routine_exercises')
    .select('id, metric_targets, enabled_measurements')
    .eq('id', exercise.id)
    .single();

  if (readError) {
    console.error('  ❌ Read error:', readError);
    return;
  }

  console.log('  metric_targets:', updated.metric_targets);
  console.log('  enabled_measurements:', updated.enabled_measurements);

  const stillHasWeight = updated.metric_targets && 'weight' in updated.metric_targets;
  console.log(`  Has 'weight' key in metric_targets: ${stillHasWeight}`);
  if (stillHasWeight) {
    console.log(`  Weight value: ${updated.metric_targets.weight}`);
  }

  if (!stillHasWeight) {
    console.log('\n❌ PROBLEM FOUND: weight key was lost after update!');
    console.log('   PostgreSQL JSONB stripped out the null value.');
  } else if (updated.metric_targets.weight === null) {
    console.log('\n✅ GOOD: weight key preserved with null value');
  }
}

testWeightMeasurement().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
