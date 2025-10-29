import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificWorkoutInstance() {
  console.log('\n🔍 CHECKING SPECIFIC WORKOUT INSTANCE\n');

  const instanceId = 'dadca4a5-0959-4ca8-8659-6f1619a97d59';

  // Get the instance
  const { data: instance, error: instError } = await supabase
    .from('workout_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (instError || !instance) {
    console.error('❌ Error fetching instance:', instError);
    return;
  }

  console.log(`📋 Instance ID: ${instance.id}`);
  console.log(`📋 Workout ID: ${instance.workout_id}`);
  console.log(`📋 Athlete ID: ${instance.athlete_id}`);
  console.log(`📋 Status: ${instance.status}`);

  // Get the workout with full data (same query as execute page)
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select(`
      *,
      routines (
        *,
        routine_exercises (
          *,
          exercises (*)
        )
      )
    `)
    .eq('id', instance.workout_id)
    .single();

  if (workoutError || !workout) {
    console.error('❌ Error fetching workout:', workoutError);
    return;
  }

  console.log(`\n📝 Workout: ${workout.name}`);
  console.log(`📝 Athlete ID: ${workout.athlete_id || 'TEMPLATE (null)'}`);

  if (!workout.routines || workout.routines.length === 0) {
    console.log('⚠️  No routines found');
    return;
  }

  workout.routines.forEach((routine: any) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 Routine: ${routine.name} (ID: ${routine.id})`);

    if (!routine.routine_exercises || routine.routine_exercises.length === 0) {
      console.log('   ⚠️  No exercises found');
      return;
    }

    routine.routine_exercises.forEach((ex: any) => {
      console.log(`\n   🏋️ Exercise: ${ex.exercises?.name || 'Unknown'} (ID: ${ex.id})`);
      console.log(`      Sets: ${ex.sets || 'N/A'}`);
      console.log(`      AMRAP: ${ex.is_amrap ? 'YES' : 'NO'}`);
      console.log(`      Enabled Measurements: ${ex.enabled_measurements ? JSON.stringify(ex.enabled_measurements) : 'NULL/EMPTY'}`);
      console.log(`      Metric Targets: ${ex.metric_targets ? JSON.stringify(ex.metric_targets) : 'NULL/EMPTY'}`);
      console.log(`      Set Configurations: ${ex.set_configurations ? JSON.stringify(ex.set_configurations) : 'NULL/EMPTY'}`);
      console.log(`      Intensity Targets: ${ex.intensity_targets ? JSON.stringify(ex.intensity_targets) : 'NULL/EMPTY'}`);

      // Flag if exercise has no metric configuration
      const hasMetrics = ex.metric_targets && Object.keys(ex.metric_targets).length > 0;
      if (!hasMetrics) {
        console.log(`      ❌ NO METRIC TARGETS - Exercise is NOT configured!`);
      } else {
        console.log(`      ✅ Has metric targets`);
      }
    });
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

checkSpecificWorkoutInstance()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
