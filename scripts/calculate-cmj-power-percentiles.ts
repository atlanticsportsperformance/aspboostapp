/**
 * Calculate percentiles for the newly added CMJ power metrics
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
  console.log('📊 Calculating Percentiles for CMJ Power Metrics\n');

  const metrics = [
    { column: 'peak_takeoff_power_trial_value', name: 'CMJ Peak Power' },
    { column: 'bodymass_relative_takeoff_power_trial_value', name: 'CMJ Peak Power/BM' }
  ];

  const startTime = Date.now();

  for (const metric of metrics) {
    console.log(`\n📈 ${metric.name} (${metric.column})\n`);

    for (const level of PLAY_LEVELS) {
      process.stdout.write(`  ${level.padEnd(15)} ... `);

      const { data: count, error } = await supabase
        .rpc('recalculate_percentiles_for_metric', {
          p_metric_column: metric.column,
          p_play_level: level
        });

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ ${count} values`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ Percentile calculation complete!`);
  console.log(`⏱️  Took ${duration} seconds\n`);

  // Verify percentiles were added
  const { count: totalCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 percentile_lookup now has ${totalCount} total rows\n`);

  // Test lookups for 50th percentile values
  console.log('🧪 Testing lookups for 50th percentile (College):\n');

  for (const metric of metrics) {
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
      console.log(`  ${metric.name.padEnd(25)} ${lookup.value.toFixed(2).padStart(10)} → ${lookup.percentile}th percentile`);
    }
  }

  console.log('\n✅ CMJ Power metrics now have percentile rankings!\n');
}

main().catch(console.error);
