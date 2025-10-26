/**
 * Check if there are duplicate 0th percentile values
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking for Duplicate 0th Percentile Values\n');

  // Look for metrics with multiple 0th percentile entries
  const { data: zeroPercentiles } = await supabase
    .from('percentile_lookup')
    .select('metric_column, play_level, value, percentile')
    .eq('percentile', 0)
    .order('metric_column')
    .order('play_level')
    .order('value');

  if (!zeroPercentiles || zeroPercentiles.length === 0) {
    console.log('✅ No 0th percentile values found (that would be weird!)\n');
    return;
  }

  console.log(`Found ${zeroPercentiles.length} entries with 0th percentile\n`);

  // Group by metric and level
  const grouped: Record<string, any[]> = {};

  zeroPercentiles.forEach(row => {
    const key = `${row.metric_column}__${row.play_level}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  console.log('0th Percentile Entries by Metric:\n');

  for (const [key, entries] of Object.entries(grouped)) {
    const [metric, level] = key.split('__');

    if (entries.length > 1) {
      console.log(`❌ ${metric} (${level}): ${entries.length} entries with 0th percentile!`);
      entries.forEach((e, i) => {
        console.log(`   ${i + 1}. Value: ${e.value}`);
      });
      console.log('   ^ This is WRONG - only the lowest value should be 0th percentile!\n');
    } else {
      console.log(`✅ ${metric} (${level}): 1 entry (correct)`);
      console.log(`   Lowest value: ${entries[0].value}\n`);
    }
  }

  // Check if there are any tied values (same value, different percentiles)
  console.log('\n📊 Checking for tied values with different percentiles...\n');

  const { data: sampleMetric } = await supabase
    .from('percentile_lookup')
    .select('value, percentile')
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College')
    .order('value')
    .limit(10);

  if (sampleMetric) {
    console.log('Sample: Net Peak Force (College) - First 10 values:\n');
    sampleMetric.forEach(row => {
      console.log(`  Value: ${row.value.toFixed(2).padStart(10)} → ${row.percentile}th percentile`);
    });
  }
}

main().catch(console.error);
