/**
 * Script to verify that percentiles are coming from real Driveline data
 */

import { createServiceRoleClient } from '../lib/supabase/server';

async function verifyPercentilesReal() {
  const supabase = createServiceRoleClient();

  console.log('\n=== Verifying Driveline Percentile Data ===\n');

  // Check metrics we're using
  const metrics = [
    'bodymass_relative_takeoff_power_trial_value', // CMJ
    'sj_bodymass_relative_takeoff_power_trial_value', // SJ
    'hop_mean_rsi_trial_value', // HJ
    'ppu_peak_takeoff_force_trial_value', // PPU
    'net_peak_vertical_force_trial_value', // IMTP Net Peak Force
    'relative_strength_trial_value', // IMTP Relative Strength
  ];

  for (const metric of metrics) {
    const { data, error } = await supabase
      .from('percentile_lookup')
      .select('*')
      .eq('metric_column', metric)
      .eq('play_level', 'College')
      .order('percentile', { ascending: true })
      .limit(5);

    if (error) {
      console.error(`❌ Error querying ${metric}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ NO DATA for ${metric}`);
      continue;
    }

    console.log(`✅ ${metric}:`);
    console.log(`   Found ${data.length} sample values (showing 1st, 25th, 50th, 75th, 99th percentiles)`);

    // Get specific percentiles
    const p1 = data.find((d: any) => d.percentile === 1);
    const p25 = data.find((d: any) => d.percentile === 25);
    const p50 = data.find((d: any) => d.percentile === 50);
    const p75 = data.find((d: any) => d.percentile === 75);
    const p99 = data.find((d: any) => d.percentile === 99);

    if (p1) console.log(`   1st:  ${p1.value}`);
    if (p25) console.log(`   25th: ${p25.value}`);
    if (p50) console.log(`   50th: ${p50.value}`);
    if (p75) console.log(`   75th: ${p75.value}`);
    if (p99) console.log(`   99th: ${p99.value}`);
    console.log('');
  }

  // Check total count in percentile_lookup
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total percentile_lookup rows: ${count}`);

  // Get unique metric columns
  const { data: uniqueMetrics } = await supabase
    .from('percentile_lookup')
    .select('metric_column')
    .limit(1000);

  const uniqueMetricSet = new Set(uniqueMetrics?.map((m: any) => m.metric_column) || []);
  console.log(`📊 Unique metrics in database: ${uniqueMetricSet.size}`);
  console.log('   Metrics:', Array.from(uniqueMetricSet).join(', '));
}

verifyPercentilesReal()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
