/**
 * Check SJ percentile issue for athlete fc6ad90a-0db4-459d-b34a-9e9a68f00b8e
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSJPercentileIssue() {
  const athleteId = 'fc6ad90a-0db4-459d-b34a-9e9a68f00b8e';

  console.log('\n📊 Checking SJ Percentile Issue\n');
  console.log('=' .repeat(80));

  // 1. Get all SJ history rows for this athlete
  const { data: historyRows, error: historyError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('test_type', 'SJ')
    .order('test_date', { ascending: true });

  if (historyError) {
    console.error('Error fetching history:', historyError);
    return;
  }

  console.log(`\n1. SJ HISTORY ROWS (${historyRows.length} total):\n`);

  for (const row of historyRows) {
    const date = new Date(row.test_date).toLocaleString();
    console.log(`Date: ${date}`);
    console.log(`  Metric: ${row.metric_name}`);
    console.log(`  Value: ${row.value}`);
    console.log(`  Play Level Percentile: ${row.percentile_play_level}`);
    console.log(`  Overall Percentile: ${row.percentile_overall}`);
    console.log(`  Test ID: ${row.test_id}`);
    console.log('');
  }

  // 2. For each problematic row (0th percentile), check what the lookup table says NOW
  console.log('\n2. CURRENT LOOKUP TABLE VALUES:\n');

  const problematic = historyRows.filter(r => r.percentile_play_level === 0);

  for (const row of problematic) {
    console.log(`\nProblematic Row: ${row.metric_name} = ${row.value} (showing 0th percentile)`);

    // Determine metric column name
    let metricColumn = row.metric_name === 'Peak Power / BM (W/kg)'
      ? 'sj_bodymass_relative_takeoff_power_trial_value'
      : 'sj_peak_takeoff_power_trial_value';

    console.log(`  Looking up: ${metricColumn} for High School`);

    // Check what percentile it SHOULD be
    const { data: lookupData, error: lookupError } = await supabase
      .from('percentile_lookup')
      .select('percentile, value')
      .eq('metric_column', metricColumn)
      .eq('play_level', 'High School')
      .lte('value', row.value)
      .order('value', { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error('  ❌ Error querying lookup:', lookupError);
    } else if (!lookupData || lookupData.length === 0) {
      console.log('  ❌ NO MATCHING DATA in percentile_lookup');
      console.log('     This means the lookup table is missing High School SJ data!');
    } else {
      console.log(`  ✅ Found matching percentile: ${lookupData[0].percentile}th`);
      console.log(`     (Threshold value: ${lookupData[0].value})`);
      console.log(`     MISMATCH: History shows 0th but should be ${lookupData[0].percentile}th`);
    }
  }

  // 3. Check if lookup table has High School SJ data at all
  console.log('\n3. HIGH SCHOOL SJ DATA IN LOOKUP TABLE:\n');

  const { data: hssjData, error: hssjError } = await supabase
    .from('percentile_lookup')
    .select('metric_column, COUNT(*)')
    .eq('play_level', 'High School')
    .in('metric_column', [
      'sj_bodymass_relative_takeoff_power_trial_value',
      'sj_peak_takeoff_power_trial_value'
    ])
    .group('metric_column');

  if (hssjError) {
    console.error('Error:', hssjError);
  } else {
    console.log('High School SJ metrics in lookup table:');
    console.log(JSON.stringify(hssjData, null, 2));
  }

  // 4. Check contributions for this athlete
  console.log('\n4. CONTRIBUTIONS FOR THIS ATHLETE:\n');

  const { data: contribs, error: contribsError } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('test_type', 'SJ');

  if (contribsError) {
    console.error('Error:', contribsError);
  } else {
    console.log(`Found ${contribs.length} SJ contributions:`);
    for (const contrib of contribs) {
      const date = new Date(contrib.test_date).toLocaleString();
      console.log(`\nTest Date: ${date}`);
      console.log(`  Peak Power: ${contrib.sj_peak_takeoff_power_trial_value}`);
      console.log(`  Peak Power/BM: ${contrib.sj_bodymass_relative_takeoff_power_trial_value}`);
      console.log(`  Contributed At: ${new Date(contrib.contributed_at).toLocaleString()}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkSJPercentileIssue().catch(console.error);
