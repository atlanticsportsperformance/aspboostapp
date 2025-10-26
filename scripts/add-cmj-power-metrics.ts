/**
 * Add CMJ Peak Power metrics to percentile_metric_mappings
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📊 Adding CMJ Peak Power Metrics to Percentile System\n');

  // Insert the two new metrics
  const { error } = await supabase
    .from('percentile_metric_mappings')
    .insert([
      {
        driveline_name: 'peak_takeoff_power_cmj',
        vald_table: 'cmj_tests',
        vald_field_name: 'peak_takeoff_power_trial_value',
        test_type: 'CMJ',
        metric_name: 'peak_power',
        display_name: 'Peak Power',
        unit: 'W',
        calculation_type: 'direct',
        is_composite_metric: false,
        composite_priority: null
      },
      {
        driveline_name: 'peak_power_per_bw_cmj',
        vald_table: 'cmj_tests',
        vald_field_name: 'bodymass_relative_takeoff_power_trial_value',
        test_type: 'CMJ',
        metric_name: 'peak_power_bm',
        display_name: 'Peak Power / BM',
        unit: 'W/kg',
        calculation_type: 'direct',
        is_composite_metric: false,
        composite_priority: null
      }
    ]);

  if (error) {
    console.error('❌ Error adding metrics:', error.message);
    return;
  }

  console.log('✅ Added 2 new metrics to percentile_metric_mappings:\n');
  console.log('  1. CMJ Peak Power (W)');
  console.log('  2. CMJ Peak Power / BM (W/kg)\n');

  // Verify they were added
  const { data: allMetrics } = await supabase
    .from('percentile_metric_mappings')
    .select('display_name, vald_field_name, is_composite_metric')
    .order('composite_priority', { ascending: true, nullsFirst: false });

  console.log('📋 All Metrics in System:\n');

  const compositeMetrics = allMetrics?.filter(m => m.is_composite_metric);
  const regularMetrics = allMetrics?.filter(m => !m.is_composite_metric);

  console.log('Composite Metrics (used for composite score):');
  compositeMetrics?.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.display_name}`);
  });

  console.log('\nAdditional Tracked Metrics:');
  regularMetrics?.forEach(m => {
    console.log(`  - ${m.display_name}`);
  });

  console.log('\n✅ Ready to calculate percentiles for these metrics!\n');
}

main().catch(console.error);
