import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWorkoutStructure() {
  console.log('🔍 Checking workouts and routines structure...\n');

  // Get a recent athlete workout
  const { data: workouts, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, name, athlete_id, plan_id, created_at')
    .not('athlete_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  if (workoutsError) {
    console.error('Error fetching workouts:', workoutsError);
    return;
  }

  console.log('📅 Recent Athlete Workouts:');
  console.log(workouts);
  console.log('\n');

  if (workouts && workouts.length > 0) {
    const workoutId = workouts[0].id;

    // Check routines for this workout
    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('id, workout_id, name, scheme, athlete_id, plan_id, order_index')
      .eq('workout_id', workoutId);

    if (routinesError) {
      console.error('Error fetching routines:', routinesError);
    } else {
      console.log(`📦 Routines (Blocks) for workout ${workoutId}:`);
      console.log(routines);
    }
  }

  console.log('\n✅ Done!');
}

checkWorkoutStructure();
