import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorkoutStatus() {
  console.log('📊 Checking workout instances...\n');

  // First check completed workouts
  const { data: completedWorkouts } = await supabase
    .from('workout_instances')
    .select('id, athlete_id, status, created_at, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (completedWorkouts && completedWorkouts.length > 0) {
    console.log(`✅ Found ${completedWorkouts.length} completed workouts:\n`);
    for (const w of completedWorkouts) {
      console.log(`Workout ID: ${w.id}`);
      console.log(`  Status: ${w.status}`);
      console.log(`  Completed: ${w.completed_at}`);

      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('id, exercise_id, actual_reps, actual_weight, metric_data')
        .eq('workout_instance_id', w.id);

      console.log(`  Exercise logs: ${logs?.length || 0}`);
      if (logs && logs.length > 0) {
        logs.slice(0, 3).forEach(log => {
          console.log(`    - Exercise: ${log.exercise_id}, Reps: ${log.actual_reps}, Weight: ${log.actual_weight}, Custom: ${JSON.stringify(log.metric_data)}`);
        });
      }
      console.log('');
    }
  }

  console.log('\n📋 Recent workout instances:\n');

  const { data: workouts, error } = await supabase
    .from('workout_instances')
    .select('id, athlete_id, status, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!workouts || workouts.length === 0) {
    console.log('No workout instances found');
    return;
  }

  console.log(`Found ${workouts.length} recent workouts:\n`);

  for (const w of workouts) {
    console.log(`Workout ID: ${w.id}`);
    console.log(`  Status: ${w.status}`);
    console.log(`  Created: ${w.created_at}`);
    console.log(`  Completed: ${w.completed_at || 'N/A'}`);

    // Check for exercise logs
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('id, exercise_id, actual_reps, actual_weight, metric_data')
      .eq('workout_instance_id', w.id);

    console.log(`  Exercise logs: ${logs?.length || 0}`);
    if (logs && logs.length > 0) {
      logs.forEach(log => {
        console.log(`    - Exercise: ${log.exercise_id}, Reps: ${log.actual_reps}, Weight: ${log.actual_weight}, Custom: ${JSON.stringify(log.metric_data)}`);
      });
    }
    console.log('');
  }
}

checkWorkoutStatus().catch(console.error);
