import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLastWorkoutPRs() {
  console.log('🏆 Finding workouts with exercise logs...');

  // First, find workouts that have exercise logs
  const { data: workoutsWithLogs, error: logsCheckError } = await supabase
    .from('exercise_logs')
    .select('workout_instance_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (logsCheckError || !workoutsWithLogs || workoutsWithLogs.length === 0) {
    console.log('⚠️  No exercise logs found in database');
    return;
  }

  const uniqueWorkoutIds = [...new Set(workoutsWithLogs.map(l => l.workout_instance_id))];
  console.log(`📊 Found ${uniqueWorkoutIds.length} workouts with exercise logs`);

  // Get the most recent workout instance that has logs
  const { data: lastWorkout, error: workoutError } = await supabase
    .from('workout_instances')
    .select(`
      id,
      athlete_id,
      completed_at,
      status
    `)
    .in('id', uniqueWorkoutIds)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (workoutError || !lastWorkout) {
    console.error('❌ Error finding last workout:', workoutError);
    return;
  }

  console.log(`✅ Found workout with logs`);
  console.log(`   Workout ID: ${lastWorkout.id}`);
  console.log(`   Status: ${lastWorkout.status}`);
  console.log(`   Completed: ${lastWorkout.completed_at}`);

  // Get all exercise logs from this workout
  const { data: exerciseLogs, error: logsError } = await supabase
    .from('exercise_logs')
    .select(`
      id,
      exercise_id,
      routine_exercise_id,
      set_number,
      actual_reps,
      actual_weight,
      actual_duration_seconds,
      metric_data,
      routine_exercises (
        id,
        tracked_max_metrics,
        exercises (
          id,
          name,
          metric_schema
        )
      )
    `)
    .eq('workout_instance_id', lastWorkout.id)
    .order('routine_exercise_id')
    .order('set_number');

  if (logsError) {
    console.error('❌ Error fetching exercise logs:', logsError);
    return;
  }

  if (!exerciseLogs || exerciseLogs.length === 0) {
    console.log('⚠️  No exercise logs found for this workout');
    return;
  }

  console.log(`\n📊 Found ${exerciseLogs.length} exercise logs`);

  // Group logs by exercise
  const exerciseGroups = exerciseLogs.reduce((acc: any, log: any) => {
    const key = log.routine_exercise_id;
    if (!acc[key]) {
      acc[key] = {
        exercise_id: log.exercise_id,
        routine_exercise: log.routine_exercises,
        logs: []
      };
    }
    acc[key].logs.push(log);
    return acc;
  }, {});

  console.log(`\n🔍 Processing ${Object.keys(exerciseGroups).length} unique exercises...\n`);

  // Process each exercise group
  for (const [routineExId, group] of Object.entries(exerciseGroups as any)) {
    const { exercise_id, routine_exercise, logs } = group;

    if (!routine_exercise?.tracked_max_metrics || routine_exercise.tracked_max_metrics.length === 0) {
      console.log(`⏭️  Skipping ${routine_exercise?.exercises?.name || 'Unknown'} - no tracked metrics`);
      continue;
    }

    console.log(`\n🎯 Processing: ${routine_exercise.exercises.name}`);
    console.log(`   Tracked metrics: ${routine_exercise.tracked_max_metrics.join(', ')}`);

    // Process each tracked metric
    for (const metricId of routine_exercise.tracked_max_metrics) {
      let maxValue = 0;

      // Find max value across all sets
      logs.forEach((log: any) => {
        let value = 0;

        // Check basic metrics
        if (metricId === 'reps') value = log.actual_reps || 0;
        else if (metricId === 'weight') value = log.actual_weight || 0;
        else if (metricId === 'time') value = log.actual_duration_seconds || 0;
        // Check custom metrics in metric_data JSONB
        else if (log.metric_data && log.metric_data[metricId]) {
          value = parseFloat(log.metric_data[metricId]) || 0;
        }

        if (value > maxValue) {
          maxValue = value;
        }
      });

      if (maxValue > 0) {
        // Get metric info
        const measurement = routine_exercise.exercises?.metric_schema?.measurements?.find((m: any) => m.id === metricId);
        const metricName = measurement?.name || metricId;
        const metricUnit = measurement?.unit || '';

        // Check current max from athlete_maxes
        const { data: currentMaxData } = await supabase
          .from('athlete_maxes')
          .select('max_value, achieved_on')
          .eq('athlete_id', lastWorkout.athlete_id)
          .eq('exercise_id', exercise_id)
          .eq('metric_id', metricId)
          .eq('reps_at_max', 1)
          .order('achieved_on', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isNewPR = !currentMaxData || maxValue > currentMaxData.max_value;

        if (isNewPR) {
          console.log(`   🎉 NEW PR! ${metricName}: ${maxValue} ${metricUnit}${currentMaxData ? ` (previous: ${currentMaxData.max_value})` : ' (first time!)'}`);

          // Save to athlete_maxes
          const { error: maxError } = await supabase
            .from('athlete_maxes')
            .insert({
              athlete_id: lastWorkout.athlete_id,
              exercise_id: exercise_id,
              metric_id: metricId,
              max_value: maxValue,
              reps_at_max: 1,
              achieved_on: lastWorkout.completed_at.split('T')[0],
              source: 'logged'
            });

          if (maxError) {
            // Check if it's a duplicate error
            if (maxError.message?.includes('duplicate') || maxError.code === '23505') {
              console.log(`   ⚠️  PR already exists for ${metricName} on this date`);
            } else {
              console.error(`   ❌ Failed to save PR for ${metricName}:`, maxError.message);
            }
          } else {
            console.log(`   ✅ PR saved successfully!`);
          }
        } else {
          console.log(`   📊 ${metricName}: ${maxValue} ${metricUnit} (not a PR, current best: ${currentMaxData?.max_value})`);
        }
      }
    }
  }

  console.log('\n✨ Done processing PRs for last workout!');
}

updateLastWorkoutPRs().catch(console.error);
