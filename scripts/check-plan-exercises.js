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

async function checkPlanExercises() {
  console.log('\n🔍 Checking exercises in PLANS (not assigned workouts)...\n');

  // Get exercises from workouts that belong to plans
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
          id,
          name,
          plan_id,
          athlete_id
        )
      ),
      exercises(name)
    `)
    .not('enabled_measurements', 'is', null)
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${exercises.length} exercises with enabled_measurements\n`);

  const planExercises = exercises.filter(ex => {
    const workout = ex.routines?.workouts?.[0];
    return workout && workout.plan_id && !workout.athlete_id;
  });

  console.log(`  ${planExercises.length} are in PLANS (plan_id set, no athlete_id)\n`);

  const athleteExercises = exercises.filter(ex => {
    const workout = ex.routines?.workouts?.[0];
    return workout && workout.athlete_id;
  });

  console.log(`  ${athleteExercises.length} are ASSIGNED TO ATHLETES (athlete_id set)\n`);

  // Check for weight measurement issues in PLANS
  const planProblems = planExercises.filter(ex => {
    if (!ex.enabled_measurements?.includes('weight')) return false;
    return !ex.metric_targets || !('weight' in ex.metric_targets);
  });

  console.log(`\n🚨 Plan exercises with weight enabled but missing from metric_targets: ${planProblems.length}`);

  if (planProblems.length > 0) {
    console.log('\n📋 Sample problems from PLANS:\n');
    planProblems.slice(0, 5).forEach(ex => {
      const workout = ex.routines?.workouts?.[0];
      console.log(`  Exercise: ${ex.exercises?.name}`);
      console.log(`  Routine: ${ex.routines?.name}`);
      console.log(`  Workout: ${workout?.name} (plan_id: ${workout?.plan_id})`);
      console.log(`  enabled_measurements:`, ex.enabled_measurements);
      console.log(`  metric_targets:`, ex.metric_targets);
      console.log('');
    });
  }

  // Check for weight measurement issues in ASSIGNED workouts
  const athleteProblems = athleteExercises.filter(ex => {
    if (!ex.enabled_measurements?.includes('weight')) return false;
    return !ex.metric_targets || !('weight' in ex.metric_targets);
  });

  console.log(`\n🚨 Assigned exercises with weight enabled but missing from metric_targets: ${athleteProblems.length}`);

  if (athleteProblems.length > 0) {
    console.log('\n📋 Sample problems from ASSIGNED WORKOUTS:\n');
    athleteProblems.slice(0, 5).forEach(ex => {
      const workout = ex.routines?.workouts?.[0];
      console.log(`  Exercise: ${ex.exercises?.name}`);
      console.log(`  Routine: ${ex.routines?.name}`);
      console.log(`  Workout: ${workout?.name} (athlete_id: ${workout?.athlete_id?.substring(0, 8)}...)`);
      console.log(`  enabled_measurements:`, ex.enabled_measurements);
      console.log(`  metric_targets:`, ex.metric_targets);
      console.log('');
    });
  }

  console.log('\n💡 DIAGNOSIS:');
  if (planProblems.length > 0) {
    console.log('   ❌ The ORIGINAL PLAN exercises have the problem!');
    console.log('   ❌ When weight is toggled ON in the plan, it\'s not being added to metric_targets');
    console.log('   ❌ This problem is then COPIED to athlete workouts when the plan is assigned');
  } else if (athleteProblems.length > 0) {
    console.log('   ✅ The ORIGINAL PLAN exercises are OK');
    console.log('   ❌ The problem happens DURING plan assignment');
  } else {
    console.log('   ✅ No problems found! The issue might be resolved.');
  }
}

checkPlanExercises().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
