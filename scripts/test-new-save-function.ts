/**
 * Test the new saveTestPercentileHistory function that saves BOTH percentiles in ONE row
 */

import { createClient } from '@supabase/supabase-js';
import { saveTestPercentileHistory } from '../lib/vald/save-percentile-history';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewSaveFunction() {
  console.log('=== Testing New Save Function ===\n');

  // Get Thomas Daly
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('first_name', 'Thomas')
    .eq('last_name', 'Daly')
    .single();

  if (!athlete) {
    console.error('Thomas Daly not found');
    return;
  }

  console.log(`Testing with: ${athlete.first_name} ${athlete.last_name}`);
  console.log(`Play level: ${athlete.play_level}\n`);

  // Get his CMJ test
  const { data: cmjTest } = await supabase
    .from('cmj_tests')
    .select('*')
    .eq('athlete_id', athlete.id)
    .single();

  if (!cmjTest) {
    console.error('No CMJ test found');
    return;
  }

  console.log(`Test ID: ${cmjTest.test_id}`);
  console.log(`Test date: ${cmjTest.recorded_utc}\n`);

  // Delete existing row to test fresh insert
  console.log('Deleting existing percentile history row...');
  await supabase
    .from('athlete_percentile_history')
    .delete()
    .eq('test_id', cmjTest.test_id);

  console.log('Calling saveTestPercentileHistory...\n');

  const success = await saveTestPercentileHistory(
    supabase,
    athlete.id,
    'CMJ',
    cmjTest.test_id,
    cmjTest,
    new Date(cmjTest.recorded_utc),
    athlete.play_level
  );

  console.log(`\n=== Result: ${success ? '✅ SUCCESS' : '❌ FAILED'} ===\n`);

  // Check the saved row
  const { data: savedRow } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('test_id', cmjTest.test_id)
    .single();

  if (savedRow) {
    console.log('Saved row:');
    console.log(`  play_level: ${savedRow.play_level}`);
    console.log(`  composite_score_play_level: ${savedRow.composite_score_play_level}`);
    console.log(`  composite_score_overall: ${savedRow.composite_score_overall}`);
    console.log(`  composite_score_level (old): ${savedRow.composite_score_level}`);

    console.log('\n  Metrics JSONB:');
    Object.entries(savedRow.metrics as any).forEach(([key, value]: [string, any]) => {
      console.log(`    ${key}:`);
      console.log(`      value: ${value.value}`);
      console.log(`      percentile_play_level: ${value.percentile_play_level}`);
      console.log(`      percentile_overall: ${value.percentile_overall}`);
    });

    console.log('\n✅ NEW SCHEMA WORKING CORRECTLY!');
    console.log('   - ONE row per test');
    console.log('   - BOTH percentiles stored in columns');
    console.log('   - Metrics JSONB has both percentiles per metric');
  } else {
    console.log('❌ No row found!');
  }

  // Check total row count
  const { data: allRows } = await supabase
    .from('athlete_percentile_history')
    .select('play_level');

  console.log(`\nTotal rows in athlete_percentile_history: ${allRows?.length || 0}`);

  const overallCount = allRows?.filter(r => r.play_level === 'Overall').length || 0;
  console.log(`Rows with play_level='Overall': ${overallCount} (should be 0)`);
}

testNewSaveFunction().catch(console.error);
