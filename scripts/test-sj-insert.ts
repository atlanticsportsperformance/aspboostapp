/**
 * Test if we can insert into sj_tests table with the missing columns
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

async function main() {
  console.log('🧪 Testing SJ test insert...\n');

  // Try to insert a minimal SJ test with the problematic column
  const testData = {
    athlete_id: SCOTT_ID,
    test_id: 'test-sj-' + Date.now(),
    recorded_utc: new Date().toISOString(),
    recorded_timezone: 'UTC',
    bm_rel_abs_con_impulse_trial_value: 123.45,
    bm_rel_abs_con_impulse_trial_unit: 'N·s',
  };

  console.log('Attempting to insert:', testData);

  const { data, error } = await supabase
    .from('sj_tests')
    .insert([testData])
    .select();

  if (error) {
    console.error('\n❌ Insert failed:', error.message);
    console.error('Details:', error);
    return;
  }

  console.log('\n✅ Insert successful!');
  console.log('Data:', data);

  // Clean up the test row
  if (data && data.length > 0) {
    await supabase
      .from('sj_tests')
      .delete()
      .eq('test_id', testData.test_id);
    console.log('\n🗑️  Test row deleted');
  }
}

main().catch(console.error);
