import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectInsert() {
  console.log('🧪 Testing direct insert to exercise_logs...\n');

  // Get a real workout instance
  const { data: workout } = await supabase
    .from('workout_instances')
    .select('id, athlete_id')
    .limit(1)
    .single();

  if (!workout) {
    console.log('❌ No workout instances found');
    return;
  }

  console.log('✅ Found workout:', workout.id);

  // Get a real exercise
  const { data: exercise } = await supabase
    .from('exercises')
    .select('id')
    .limit(1)
    .single();

  if (!exercise) {
    console.log('❌ No exercises found');
    return;
  }

  console.log('✅ Found exercise:', exercise.id);

  // Get a routine exercise
  const { data: routineExercise } = await supabase
    .from('routine_exercises')
    .select('id')
    .limit(1)
    .single();

  console.log('✅ Found routine exercise:', routineExercise?.id || 'N/A');

  // Try to insert a test log
  const testLog = {
    workout_instance_id: workout.id,
    routine_exercise_id: routineExercise?.id || '00000000-0000-0000-0000-000000000000',
    athlete_id: workout.athlete_id,
    exercise_id: exercise.id,
    set_number: 1,
    target_sets: 3,
    actual_reps: 10,
    actual_weight: 135,
    metric_data: { time: 60, rpe: 8, notes: 'Test log' }
  };

  console.log('\n🔍 Attempting insert with data:', testLog);

  const { data, error } = await supabase
    .from('exercise_logs')
    .insert(testLog)
    .select();

  if (error) {
    console.error('\n❌ INSERT FAILED!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ INSERT SUCCEEDED!');
    console.log('Inserted log:', data);

    // Clean up
    if (data && data[0]) {
      console.log('\n🗑️  Cleaning up test log...');
      await supabase.from('exercise_logs').delete().eq('id', data[0].id);
      console.log('✅ Cleaned up');
    }
  }
}

testDirectInsert().catch(console.error);
