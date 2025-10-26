/**
 * Check if percentiles were recalculated with new logic
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking if Percentiles Were Recalculated\n');

  // Check for the telltale sign: multiple 0th percentiles
  const { data: zeroPercentiles } = await supabase
    .from('percentile_lookup')
    .select('metric_column, play_level, value')
    .eq('percentile', 0)
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College')
    .order('value');

  console.log('Net Peak Force (College) - Values with 0th percentile:\n');

  if (zeroPercentiles && zeroPercentiles.length > 0) {
    zeroPercentiles.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.value} N`);
    });

    if (zeroPercentiles.length > 1) {
      console.log(`\n❌ STILL BROKEN: ${zeroPercentiles.length} values with 0th percentile`);
      console.log('\nThis means either:');
      console.log('  1. Migration was not applied');
      console.log('  2. Percentiles were not recalculated after migration');
      console.log('\nYou need to:');
      console.log('  1. Apply FIX_PERCENTILE_CALCULATION_ROUNDING.sql in Supabase Dashboard');
      console.log('  2. Run: npx tsx scripts/populate-percentile-lookup-OPTIMIZED.ts\n');
    } else {
      console.log('\n✅ FIXED: Only 1 value has 0th percentile (the minimum)');
    }
  }

  // Check the calculated_at timestamp to see when it was last updated
  const { data: recentUpdate } = await supabase
    .from('percentile_lookup')
    .select('calculated_at')
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (recentUpdate) {
    const lastUpdate = new Date(recentUpdate.calculated_at);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);

    console.log(`\nLast percentile calculation: ${minutesAgo} minutes ago`);
    console.log(`(${lastUpdate.toLocaleString()})\n`);
  }
}

main().catch(console.error);
