import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorkoutMetrics() {
  // Get a recent workout instance
  const { data: instances, error: instErr } = await supabase
    .from('workout_instances')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (instErr || !instances || instances.length === 0) {
    console.error('No workout instances found:', instErr);
    return;
  }

  const instance = instances[0];
  console.log('\n📋 Workout Instance:', instance.id);
  console.log('Status:', instance.status);
  console.log('Workout ID:', instance.workout_id);

  // Get routines for this workout
  const { data: routines, error: routErr } = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        *,
        exercises (
          name,
          metric_schema
        )
      )
    `)
    .eq('workout_id', instance.workout_id);

  if (routErr || !routines) {
    console.error('Error fetching routines:', routErr);
    return;
  }

  console.log('\n🔍 Checking metric_targets for each exercise:\n');

  for (const routine of routines) {
    console.log(`\n📦 Block: ${routine.name}`);

    if (!routine.routine_exercises || routine.routine_exercises.length === 0) {
      console.log('   No exercises');
      continue;
    }

    for (const ex of routine.routine_exercises) {
      console.log(`\n   ✏️ ${ex.exercises?.name || 'Unknown'}`);
      console.log(`      ID: ${ex.id}`);
      console.log(`      metric_targets:`, JSON.stringify(ex.metric_targets, null, 8));
      console.log(`      set_configurations:`, ex.set_configurations ? 'Has per-set config' : 'null');

      if (ex.metric_targets) {
        const keys = Object.keys(ex.metric_targets);
        console.log(`      Metrics (${keys.length}):`, keys.join(', '));

        // Separate into primary and secondary
        const primary = keys.filter(k => k === 'reps' || k.toLowerCase().endsWith('_reps'));
        const secondary = keys.filter(k => !(k === 'reps' || k.toLowerCase().endsWith('_reps')));

        console.log(`      Primary (${primary.length}):`, primary.join(', '));
        console.log(`      Secondary (${secondary.length}):`, secondary.join(', '));
      }
    }
  }
}

checkWorkoutMetrics();
