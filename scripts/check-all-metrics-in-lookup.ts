/**
 * Check ALL unique metric columns in percentile_lookup
 */

import { createClient } from '@supabase/supabase-js';

async function checkAllMetrics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking ALL metrics in percentile_lookup...\n');

  // Get unique metric_column values
  const { data: allRows } = await supabase
    .from('percentile_lookup')
    .select('metric_column, play_level, value, percentile')
    .order('metric_column');

  if (!allRows || allRows.length === 0) {
    console.error('❌ No data in percentile_lookup');
    return;
  }

  // Group by metric_column
  const metricGroups = new Map<string, any[]>();
  for (const row of allRows) {
    if (!metricGroups.has(row.metric_column)) {
      metricGroups.set(row.metric_column, []);
    }
    metricGroups.get(row.metric_column)!.push(row);
  }

  console.log(`📊 Found ${metricGroups.size} unique metrics in percentile_lookup:\n`);

  // Show details for each metric
  for (const [metric, rows] of metricGroups.entries()) {
    console.log(`\n${metric}:`);
    console.log(`   Total rows: ${rows.length}`);

    // Check how many have non-null values
    const nonNullRows = rows.filter(r => r.value !== null);
    console.log(`   Non-null values: ${nonNullRows.length}`);

    // Show sample values
    if (nonNullRows.length > 0) {
      const sampleValues = nonNullRows.slice(0, 3).map(r =>
        `${r.value} (${r.percentile}th, ${r.play_level})`
      );
      console.log(`   Sample: ${sampleValues.join(', ')}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total rows in table: ${allRows.length}`);
  console.log(`Total unique metrics: ${metricGroups.size}`);
  console.log(`${'='.repeat(60)}\n`);

  // Expected 8 metrics
  const expected = [
    'peak_takeoff_power_trial_value',
    'bodymass_relative_takeoff_power_trial_value',
    'sj_peak_takeoff_power_trial_value',
    'sj_bodymass_relative_takeoff_power_trial_value',
    'hop_mean_rsi_trial_value',
    'ppu_peak_takeoff_force_trial_value',
    'net_peak_vertical_force_trial_value',
    'relative_strength_trial_value',
  ];

  console.log('✅ Expected metrics (8):\n');
  for (const metric of expected) {
    const exists = metricGroups.has(metric);
    console.log(`   ${exists ? '✅' : '❌'} ${metric}`);
  }
}

checkAllMetrics().catch(console.error);
