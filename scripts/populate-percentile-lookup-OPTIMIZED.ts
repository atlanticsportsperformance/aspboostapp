/**
 * Populate percentile_lookup table one metric at a time to avoid timeout
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAY_LEVELS = ['Youth', 'High School', 'College', 'Pro', 'Overall'];

async function main() {
  console.log('📊 Populating Percentile Lookup Table (Optimized)\n');

  // Get all metrics from mappings
  const { data: metrics } = await supabase
    .from('percentile_metric_mappings')
    .select('vald_field_name, display_name')
    .order('composite_priority');

  if (!metrics || metrics.length === 0) {
    console.error('❌ No metrics found in percentile_metric_mappings');
    process.exit(1);
  }

  console.log(`Found ${metrics.length} metrics to calculate\n`);

  let totalCalculated = 0;
  const startTime = Date.now();

  for (const metric of metrics) {
    console.log(`\n📈 ${metric.display_name} (${metric.vald_field_name})`);

    for (const level of PLAY_LEVELS) {
      process.stdout.write(`  ${level.padEnd(15)} ... `);

      const { data: count, error } = await supabase
        .rpc('recalculate_percentiles_for_metric', {
          p_metric_column: metric.vald_field_name,
          p_play_level: level
        });

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ ${count} values`);
        totalCalculated += count || 0;
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ Percentile calculation complete!`);
  console.log(`⏱️  Took ${duration} seconds`);
  console.log(`📊 Total percentile values: ${totalCalculated}\n`);

  // Verify the lookup table
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ percentile_lookup table now has ${count} rows\n`);

  // Test lookups for the 6 composite metrics
  console.log('🧪 Testing lookups for 50th percentile values (College):\n');

  const compositeMetrics = [
    { column: 'net_peak_vertical_force_trial_value', name: 'Net Peak Force' },
    { column: 'relative_strength_trial_value', name: 'Relative Strength' },
    { column: 'ppu_peak_takeoff_force_trial_value', name: 'Peak Force (PPU)' },
    { column: 'sj_peak_takeoff_power_trial_value', name: 'Peak Power (SJ)' },
    { column: 'sj_bodymass_relative_takeoff_power_trial_value', name: 'Peak Power/BM (SJ)' },
    { column: 'hop_mean_rsi_trial_value', name: 'RSI (HJ)' },
  ];

  for (const metric of compositeMetrics) {
    // Get the 50th percentile value
    const { data: lookup } = await supabase
      .from('percentile_lookup')
      .select('value, percentile')
      .eq('metric_column', metric.column)
      .eq('play_level', 'College')
      .gte('percentile', 48)
      .lte('percentile', 52)
      .order('percentile', { ascending: true })
      .limit(1)
      .single();

    if (lookup) {
      console.log(`  ${metric.name.padEnd(30)} Value: ${lookup.value.toFixed(2).padStart(10)}  →  ${lookup.percentile}th percentile`);
    }
  }

  console.log('\n🎉 Percentile lookup table is ready!\n');
}

main().catch(console.error);
