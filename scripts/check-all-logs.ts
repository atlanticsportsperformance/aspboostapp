import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllLogs() {
  console.log('📊 Checking ALL exercise logs in database...\n');

  const { data: logs, error } = await supabase
    .from('exercise_logs')
    .select('id, workout_instance_id, exercise_id, actual_reps, actual_weight, metric_data, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('⚠️  No exercise logs found in database');
    return;
  }

  console.log(`✅ Found ${logs.length} exercise logs:\n`);

  for (const log of logs) {
    console.log(`Log ID: ${log.id}`);
    console.log(`  Workout: ${log.workout_instance_id}`);
    console.log(`  Exercise: ${log.exercise_id}`);
    console.log(`  Reps: ${log.actual_reps}, Weight: ${log.actual_weight}`);
    console.log(`  Custom metrics: ${JSON.stringify(log.metric_data)}`);
    console.log(`  Created: ${log.created_at}\n`);
  }
}

checkAllLogs().catch(console.error);
