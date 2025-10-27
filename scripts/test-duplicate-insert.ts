/**
 * Test if we can insert BOTH play_level and Overall rows for the same test
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDuplicateInsert() {
  const testAthleteId = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f'; // Scott Blewett
  const testId = 'TEST_DUPLICATE_CHECK_123';

  console.log('Testing duplicate insert with different play_level...\n');

  // Try to insert Pro level
  console.log('1. Inserting with play_level = "Pro"...');
  const { data: insert1, error: error1 } = await supabase
    .from('athlete_percentile_history')
    .insert({
      athlete_id: testAthleteId,
      test_type: 'CMJ',
      test_date: new Date().toISOString(),
      test_id: testId,
      play_level: 'Pro',
      metrics: { test: { value: 100, percentile: 50 } },
      composite_score_level: 50,
    })
    .select();

  if (error1) {
    console.log('❌ Error on first insert:', error1.message, `(code: ${error1.code})`);
  } else {
    console.log('✅ First insert succeeded');
  }

  // Try to insert Overall level for SAME test_id
  console.log('\n2. Inserting with play_level = "Overall" (same test_id)...');
  const { data: insert2, error: error2 } = await supabase
    .from('athlete_percentile_history')
    .insert({
      athlete_id: testAthleteId,
      test_type: 'CMJ',
      test_date: new Date().toISOString(),
      test_id: testId,
      play_level: 'Overall',
      metrics: { test: { value: 100, percentile: 45 } },
      composite_score_level: 45,
    })
    .select();

  if (error2) {
    console.log('❌ Error on second insert:', error2.message, `(code: ${error2.code})`);
    console.log('\n🔍 This confirms the unique constraint does NOT include play_level');
  } else {
    console.log('✅ Second insert succeeded');
    console.log('\n🔍 Unique constraint DOES include play_level (good!)');
  }

  // Clean up test data
  console.log('\n3. Cleaning up test data...');
  await supabase
    .from('athlete_percentile_history')
    .delete()
    .eq('test_id', testId);
  console.log('✅ Cleanup done');
}

testDuplicateInsert().catch(console.error);
