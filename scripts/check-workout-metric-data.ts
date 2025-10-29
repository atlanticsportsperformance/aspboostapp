import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorkoutMetricData() {
  console.log('\n🔍 CHECKING WORKOUT METRIC DATA\n');

  // Get recent workouts (both templates and athlete-specific)
  const { data: workouts, error: workoutError } = await supabase
    .from('workouts')
    .select(`
      id,
      name,
      athlete_id,
      routines (
        id,
        name,
        routine_exercises (
          id,
          sets,
          metric_targets,
          set_configurations,
          intensity_targets,
          is_amrap,
          enabled_measurements,
          exercises (
            id,
            name
          )
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (workoutError) {
    console.error('❌ Error fetching workouts:', workoutError);
    return;
  }

  console.log(`📋 Found ${workouts?.length || 0} recent workouts\n`);

  workouts?.forEach((workout: any) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Workout: ${workout.name}`);
    console.log(`   ID: ${workout.id}`);
    console.log(`   Athlete ID: ${workout.athlete_id || 'TEMPLATE (null)'}`);

    if (!workout.routines || workout.routines.length === 0) {
      console.log('   ⚠️  No routines found');
      return;
    }

    workout.routines.forEach((routine: any) => {
      console.log(`\n   📦 Routine: ${routine.name} (ID: ${routine.id})`);

      if (!routine.routine_exercises || routine.routine_exercises.length === 0) {
        console.log('      ⚠️  No exercises found');
        return;
      }

      routine.routine_exercises.forEach((ex: any) => {
        console.log(`\n      🏋️ Exercise: ${ex.exercises?.name || 'Unknown'} (ID: ${ex.id})`);
        console.log(`         Sets: ${ex.sets || 'N/A'}`);
        console.log(`         AMRAP: ${ex.is_amrap ? 'YES' : 'NO'}`);
        console.log(`         Metric Targets: ${ex.metric_targets ? JSON.stringify(ex.metric_targets) : 'NULL/EMPTY'}`);
        console.log(`         Set Configurations: ${ex.set_configurations ? JSON.stringify(ex.set_configurations) : 'NULL/EMPTY'}`);
        console.log(`         Intensity Targets: ${ex.intensity_targets ? JSON.stringify(ex.intensity_targets) : 'NULL/EMPTY'}`);
        console.log(`         Enabled Measurements: ${ex.enabled_measurements ? JSON.stringify(ex.enabled_measurements) : 'NULL/EMPTY'}`);

        // Flag if exercise has no metric configuration
        const hasMetrics = ex.metric_targets && Object.keys(ex.metric_targets).length > 0;
        if (!hasMetrics) {
          console.log(`         ❌ NO METRIC TARGETS - Exercise is NOT configured!`);
        } else {
          console.log(`         ✅ Has metric targets`);
        }
      });
    });
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

checkWorkoutMetricData()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
