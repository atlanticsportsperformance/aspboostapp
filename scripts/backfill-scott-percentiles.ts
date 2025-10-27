/**
 * Backfill Scott's 9 rows with correct percentiles using the new schema
 */

import { createClient } from '@supabase/supabase-js';
import { saveTestPercentileHistory } from '../lib/vald/save-percentile-history';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

async function backfillScott() {
  console.log('=== Backfilling Scott Blewett Percentile History ===\n');

  // Get all his percentile history rows (the old ones with wrong structure)
  const { data: historyRows } = await supabase
    .from('athlete_percentile_history')
    .select('test_id, test_type, test_date')
    .eq('athlete_id', SCOTT_ID)
    .order('test_date', { ascending: true });

  console.log(`Found ${historyRows?.length || 0} percentile history rows for Scott\n`);

  if (!historyRows || historyRows.length === 0) {
    console.log('No rows to backfill');
    return;
  }

  const tableMap: Record<string, string> = {
    'CMJ': 'cmj_tests',
    'SJ': 'sj_tests',
    'HJ': 'hop_tests',
    'PPU': 'ppu_tests',
    'IMTP': 'imtp_tests',
  };

  let updated = 0;
  let skipped = 0;

  for (const row of historyRows) {
    const tableName = tableMap[row.test_type];
    console.log(`\n${row.test_type} test ${row.test_id.substring(0, 8)}... (${row.test_date.substring(0, 10)})`);

    if (!tableName) {
      console.log(`  ⚠️  Unknown test type, skipping`);
      skipped++;
      continue;
    }

    // Get full test data from the test table
    const { data: testData, error: testError } = await supabase
      .from(tableName)
      .select('*')
      .eq('test_id', row.test_id)
      .eq('athlete_id', SCOTT_ID)
      .single();

    if (testError || !testData) {
      console.log(`  ⚠️  Test not found in ${tableName}, skipping`);
      console.log(`      Error: ${testError?.message}`);
      skipped++;
      continue;
    }

    // Call saveTestPercentileHistory which will UPSERT (update existing row)
    console.log(`  🔄 Updating with new schema...`);
    const success = await saveTestPercentileHistory(
      supabase,
      SCOTT_ID,
      row.test_type as any,
      row.test_id,
      testData,
      new Date(testData.recorded_utc),
      'Pro' // Scott's play level
    );

    if (success) {
      console.log(`  ✅ Updated`);
      updated++;
    } else {
      console.log(`  ❌ Failed`);
      skipped++;
    }
  }

  console.log(`\n\n=== Summary ===`);
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`⚠️  Skipped: ${skipped}`);

  // Verify one row
  console.log(`\n=== Verification ===`);
  const { data: verifyRow } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', SCOTT_ID)
    .order('test_date', { ascending: false })
    .limit(1)
    .single();

  if (verifyRow) {
    console.log(`\nMost recent row:`);
    console.log(`  test_type: ${verifyRow.test_type}`);
    console.log(`  test_date: ${verifyRow.test_date}`);
    console.log(`  composite_score_play_level: ${verifyRow.composite_score_play_level}`);
    console.log(`  composite_score_overall: ${verifyRow.composite_score_overall}`);

    const metrics = verifyRow.metrics as any;
    const metricKeys = Object.keys(metrics);
    console.log(`\n  Metrics (${metricKeys.length} total):`);

    const firstMetric = metricKeys[0];
    console.log(`    ${firstMetric}:`);
    console.log(`      value: ${metrics[firstMetric].value}`);

    if ('percentile_play_level' in metrics[firstMetric]) {
      console.log(`      percentile_play_level: ${metrics[firstMetric].percentile_play_level} ✅`);
    } else {
      console.log(`      percentile_play_level: MISSING ❌`);
    }

    if ('percentile_overall' in metrics[firstMetric]) {
      console.log(`      percentile_overall: ${metrics[firstMetric].percentile_overall} ✅`);
    } else {
      console.log(`      percentile_overall: MISSING ❌`);
    }

    if ('percentile' in metrics[firstMetric]) {
      console.log(`      OLD 'percentile' field: ${metrics[firstMetric].percentile} ⚠️ (should be removed)`);
    }
  }
}

backfillScott().catch(console.error);
