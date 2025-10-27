/**
 * Standalone script to verify percentiles are from real Driveline data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyPercentilesReal() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Verifying Driveline Percentile Data ===\n');

  // Check metrics we're using
  const metrics = [
    { name: 'bodymass_relative_takeoff_power_trial_value', test: 'CMJ' },
    { name: 'sj_bodymass_relative_takeoff_power_trial_value', test: 'SJ' },
    { name: 'hop_mean_rsi_trial_value', test: 'HJ' },
    { name: 'ppu_peak_takeoff_force_trial_value', test: 'PPU' },
    { name: 'net_peak_vertical_force_trial_value', test: 'IMTP - Net Peak Force' },
    { name: 'relative_strength_trial_value', test: 'IMTP - Relative Strength' },
  ];

  for (const { name: metric, test } of metrics) {
    // Get sample percentile values for College level
    const { data, error } = await supabase
      .from('percentile_lookup')
      .select('percentile, value')
      .eq('metric_column', metric)
      .eq('play_level', 'College')
      .in('percentile', [1, 25, 50, 75, 99])
      .order('percentile', { ascending: true });

    if (error) {
      console.error(`❌ Error querying ${test}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ NO DATA for ${test} (${metric})`);
      continue;
    }

    console.log(`✅ ${test}:`);
    console.log(`   Metric: ${metric}`);
    console.log(`   College Level Percentiles (showing sample values):`);

    data.forEach((row: any) => {
      console.log(`     ${row.percentile}th: ${row.value}`);
    });
    console.log('');
  }

  // Check total count in percentile_lookup
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total percentile_lookup rows: ${count}`);

  // Get unique metric columns
  const { data: allMetrics } = await supabase
    .from('percentile_lookup')
    .select('metric_column');

  if (allMetrics) {
    const uniqueMetricSet = new Set(allMetrics.map((m: any) => m.metric_column));
    console.log(`📊 Unique metrics in database: ${uniqueMetricSet.size}`);
    console.log('   Metrics:', Array.from(uniqueMetricSet).slice(0, 10).join(', '), '...');
  }

  console.log('\n=== Testing Real Athlete Data ===\n');

  // Get Scott's latest CMJ test
  const { data: cmjTests } = await supabase
    .from('cmj_tests')
    .select('bodymass_relative_takeoff_power_trial_value, recorded_utc')
    .eq('athlete_id', 'e080c1dd-5b2d-47d4-a0cf-8d2e4e5bc8c8')
    .order('recorded_utc', { ascending: false })
    .limit(1);

  if (cmjTests && cmjTests.length > 0) {
    const power = cmjTests[0].bodymass_relative_takeoff_power_trial_value;
    console.log(`Scott's latest CMJ power: ${power} W/kg`);

    // Look up what percentile this should be
    const { data: percentileData } = await supabase
      .from('percentile_lookup')
      .select('percentile')
      .eq('metric_column', 'bodymass_relative_takeoff_power_trial_value')
      .eq('play_level', 'College')
      .lte('value', power)
      .order('value', { ascending: false })
      .limit(1);

    if (percentileData && percentileData.length > 0) {
      console.log(`✅ Calculated percentile: ${percentileData[0].percentile}th (from Driveline database)`);
    } else {
      console.log('❌ Could not calculate percentile');
    }
  }
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
