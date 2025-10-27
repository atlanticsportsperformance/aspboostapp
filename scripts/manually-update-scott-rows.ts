/**
 * Manually update Scott's 9 old rows with the new schema
 */

import { createClient } from '@supabase/supabase-js';
import { saveTestPercentileHistory } from '../lib/vald/save-percentile-history';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateScottRows() {
  console.log('=== Manually Updating Scott Blewett\'s Rows ===\n');

  // Get Scott
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('first_name', 'scott')
    .eq('last_name', 'blewett')
    .single();

  if (!athlete) {
    console.error('Scott not found');
    return;
  }

  console.log(`Athlete: ${athlete.first_name} ${athlete.last_name}`);
  console.log(`Play level: ${athlete.play_level}\n`);

  // Get all his test IDs from percentile history
  const { data: historyRows } = await supabase
    .from('athlete_percentile_history')
    .select('test_id, test_type')
    .eq('athlete_id', athlete.id);

  console.log(`Found ${historyRows?.length || 0} tests in history\n`);

  if (!historyRows || historyRows.length === 0) {
    console.log('No rows to update');
    return;
  }

  // Map test types to table names
  const tableMap: Record<string, string> = {
    'CMJ': 'cmj_tests',
    'SJ': 'sj_tests',
    'HJ': 'hop_tests',
    'PPU': 'ppu_tests',
    'IMTP': 'imtp_tests',
  };

  let updated = 0;
  let failed = 0;

  for (const row of historyRows) {
    const tableName = tableMap[row.test_type];
    if (!tableName) {
      console.log(`⚠️  Unknown test type: ${row.test_type}`);
      failed++;
      continue;
    }

    // Get the full test data
    const { data: testData } = await supabase
      .from(tableName)
      .select('*')
      .eq('test_id', row.test_id)
      .eq('athlete_id', athlete.id)
      .single();

    if (!testData) {
      console.log(`⚠️  Test not found: ${row.test_id} in ${tableName}`);
      failed++;
      continue;
    }

    console.log(`Updating ${row.test_type} test: ${row.test_id.substring(0, 8)}...`);

    const success = await saveTestPercentileHistory(
      supabase,
      athlete.id,
      row.test_type as any,
      row.test_id,
      testData,
      new Date(testData.recorded_utc),
      athlete.play_level
    );

    if (success) {
      console.log(`  ✅ Updated`);
      updated++;
    } else {
      console.log(`  ❌ Failed`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  // Verify the updates
  console.log('\n=== Verifying Updates ===');
  const { data: updatedRows } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('test_date', { ascending: false })
    .limit(3);

  if (updatedRows && updatedRows.length > 0) {
    console.log(`\nSample updated row (most recent):`);
    const sample = updatedRows[0];
    console.log(`  test_type: ${sample.test_type}`);
    console.log(`  composite_score_play_level: ${sample.composite_score_play_level}`);
    console.log(`  composite_score_overall: ${sample.composite_score_overall}`);

    const metrics = sample.metrics as any;
    const firstMetric = Object.keys(metrics)[0];
    console.log(`  Sample metric (${firstMetric}):`);
    console.log(`    percentile_play_level: ${metrics[firstMetric].percentile_play_level}`);
    console.log(`    percentile_overall: ${metrics[firstMetric].percentile_overall}`);

    if (metrics[firstMetric].percentile !== undefined) {
      console.log(`    ⚠️  OLD 'percentile' field still exists!`);
    } else {
      console.log(`    ✅ NEW schema confirmed`);
    }
  }
}

updateScottRows().catch(console.error);
