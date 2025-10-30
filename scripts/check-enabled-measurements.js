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

async function checkEnabledMeasurements() {
  console.log('Checking enabled_measurements in routine_exercises...\n');

  // Get some sample exercises with enabled_measurements
  const { data: exercises, error } = await supabase
    .from('routine_exercises')
    .select(`
      id,
      exercise_id,
      enabled_measurements,
      metric_targets,
      routines!inner(
        id,
        name,
        workouts!inner(
          id,
          name,
          athlete_id,
          plan_id
        )
      ),
      exercises(
        name,
        metric_schema
      )
    `)
    .not('enabled_measurements', 'is', null)
    .limit(20);

  if (error) {
    console.error('Error fetching exercises:', error);
    return;
  }

  console.log(`Found ${exercises.length} routine exercises with enabled_measurements\n`);

  exercises.forEach((ex) => {
    const workout = ex.routines?.workouts?.[0];
    const isFromPlan = !!workout?.plan_id;
    const isForAthlete = !!workout?.athlete_id;

    console.log(`Exercise: ${ex.exercises?.name || 'Unknown'}`);
    console.log(`  Routine: ${ex.routines?.name || 'Unknown'}`);
    console.log(`  Workout: ${workout?.name || 'Unknown'}`);
    console.log(`  From Plan: ${isFromPlan ? 'YES' : 'NO'} (plan_id: ${workout?.plan_id || 'none'})`);
    console.log(`  For Athlete: ${isForAthlete ? 'YES' : 'NO'} (athlete_id: ${workout?.athlete_id || 'none'})`);
    console.log(`  enabled_measurements:`, ex.enabled_measurements);
    console.log(`  metric_targets:`, ex.metric_targets);

    // Check if weight is in enabled_measurements but not in metric_targets
    if (ex.enabled_measurements?.includes('weight')) {
      const hasWeightTarget = ex.metric_targets && 'weight' in ex.metric_targets;
      const weightTargetValue = ex.metric_targets?.weight;
      console.log(`  ⚠️  Weight enabled: YES, Weight target: ${hasWeightTarget ? weightTargetValue : 'NONE'}`);

      if (!hasWeightTarget || weightTargetValue === null || weightTargetValue === undefined) {
        console.log(`  🔍 THIS MIGHT BE THE ISSUE - weight enabled but no target value`);
      }
    }

    console.log('');
  });

  // Check for exercises where weight is enabled but has null/undefined target
  const { data: issueExercises, error: issueError } = await supabase
    .from('routine_exercises')
    .select(`
      id,
      enabled_measurements,
      metric_targets,
      routines!inner(
        name,
        workouts!inner(
          name,
          athlete_id,
          plan_id
        )
      ),
      exercises(name)
    `)
    .contains('enabled_measurements', ['weight'])
    .not('enabled_measurements', 'is', null)
    .limit(50);

  if (!issueError && issueExercises) {
    const problemCases = issueExercises.filter(ex => {
      return !ex.metric_targets ||
             !('weight' in ex.metric_targets) ||
             ex.metric_targets.weight === null ||
             ex.metric_targets.weight === undefined;
    });

    console.log(`\n🔍 Found ${problemCases.length} exercises with weight enabled but no/null target value:\n`);

    problemCases.slice(0, 10).forEach(ex => {
      const workout = ex.routines?.workouts?.[0];
      console.log(`  - ${ex.exercises?.name || 'Unknown'} in "${ex.routines?.name}"`);
      console.log(`    Workout: "${workout?.name}" (${workout?.plan_id ? 'from plan' : 'standalone'})`);
      console.log(`    enabled_measurements:`, ex.enabled_measurements);
      console.log(`    metric_targets:`, ex.metric_targets);
      console.log('');
    });
  }
}

checkEnabledMeasurements().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
