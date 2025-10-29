import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('📊 Checking exercise_logs table schema...\n');

  // Try to insert a test record to see what columns are accepted
  const testData = {
    workout_instance_id: '00000000-0000-0000-0000-000000000000',
    routine_exercise_id: '00000000-0000-0000-0000-000000000000',
    athlete_id: '00000000-0000-0000-0000-000000000000',
    exercise_id: '00000000-0000-0000-0000-000000000000',
    set_number: 1,
    target_sets: 3,
    actual_reps: 10,
    actual_weight: 100,
    metric_data: { test_metric: 5 }
  };

  const { data, error } = await supabase
    .from('exercise_logs')
    .insert(testData)
    .select();

  if (error) {
    console.log('❌ Insert failed (expected for test)');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);
    console.log('Error hint:', error.hint);
  } else {
    console.log('✅ Test insert succeeded');
    // Delete the test record
    if (data && data[0]) {
      await supabase.from('exercise_logs').delete().eq('id', data[0].id);
      console.log('🗑️  Cleaned up test record');
    }
  }

  // Also check what columns exist by querying
  console.log('\n📋 Fetching sample record to see columns...');
  const { data: sample } = await supabase
    .from('exercise_logs')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (sample) {
    console.log('Available columns:', Object.keys(sample));
  } else {
    console.log('No records found in exercise_logs table');
  }
}

checkSchema().catch(console.error);
