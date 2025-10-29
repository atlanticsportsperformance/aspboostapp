import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBackSquatHistory() {
  console.log('🔍 Checking Back Squat exercise history...\n');

  // First find Back Squat exercise ID
  const { data: exercise } = await supabase
    .from('exercises')
    .select('id, name')
    .ilike('name', '%back squat%')
    .single();

  if (!exercise) {
    console.log('❌ Back Squat exercise not found');
    return;
  }

  console.log(`✅ Found exercise: ${exercise.name} (${exercise.id})\n`);

  // Get all exercise logs for Back Squat
  const { data: logs, error } = await supabase
    .from('exercise_logs')
    .select(`
      id,
      workout_instance_id,
      athlete_id,
      exercise_id,
      set_number,
      actual_reps,
      actual_weight,
      metric_data,
      created_at,
      workout_instances (
        id,
        completed_at,
        status
      )
    `)
    .eq('exercise_id', exercise.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching logs:', error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('⚠️  No exercise logs found for Back Squat');
    return;
  }

  console.log(`📊 Found ${logs.length} exercise logs:\n`);

  logs.forEach((log: any) => {
    console.log(`Log ID: ${log.id}`);
    console.log(`  Workout Instance: ${log.workout_instance_id}`);
    console.log(`  Athlete: ${log.athlete_id}`);
    console.log(`  Set: ${log.set_number}`);
    console.log(`  Reps: ${log.actual_reps}`);
    console.log(`  Weight: ${log.actual_weight}`);
    console.log(`  Custom Metrics: ${JSON.stringify(log.metric_data)}`);
    console.log(`  Created: ${log.created_at}`);
    console.log(`  Workout Status: ${log.workout_instances?.status || 'N/A'}`);
    console.log(`  Workout Completed: ${log.workout_instances?.completed_at || 'N/A'}`);
    console.log('');
  });

  // Group by workout
  const workoutMap = new Map();
  logs.forEach((log: any) => {
    if (!workoutMap.has(log.workout_instance_id)) {
      workoutMap.set(log.workout_instance_id, []);
    }
    workoutMap.get(log.workout_instance_id).push(log);
  });

  console.log(`\n📋 Grouped into ${workoutMap.size} unique workouts\n`);

  for (const [workoutId, workoutLogs] of workoutMap.entries()) {
    console.log(`Workout: ${workoutId}`);
    console.log(`  Sets: ${workoutLogs.length}`);
    console.log(`  Total Reps: ${workoutLogs.reduce((sum: number, l: any) => sum + (l.actual_reps || 0), 0)}`);
    console.log(`  Total Volume: ${workoutLogs.reduce((sum: number, l: any) => sum + ((l.actual_reps || 0) * (l.actual_weight || 0)), 0)} lbs`);
    console.log('');
  }
}

checkBackSquatHistory().catch(console.error);
