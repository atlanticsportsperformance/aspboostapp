/**
 * Populate the percentile_lookup table with all pre-calculated percentiles
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📊 Populating Percentile Lookup Table\n');
  console.log('This will calculate percentiles for all metrics at all play levels...\n');

  const startTime = Date.now();

  // Call the PostgreSQL function to recalculate all percentiles
  const { data, error } = await supabase.rpc('recalculate_all_percentiles');

  if (error) {
    console.error('❌ Error calculating percentiles:', error);
    process.exit(1);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('✅ Percentile calculation complete!\n');
  console.log(`⏱️  Took ${duration} seconds\n`);

  if (data && data.length > 0) {
    console.log('📊 Results by metric and play level:\n');

    let totalValues = 0;
    data.forEach((row: any) => {
      console.log(`  ${row.metric_column.padEnd(50)} ${row.play_level.padEnd(15)} ${row.value_count} values`);
      totalValues += row.value_count;
    });

    console.log(`\n  Total percentile values calculated: ${totalValues}\n`);
  }

  // Verify the lookup table
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ percentile_lookup table now has ${count} rows\n`);

  // Test a quick lookup
  console.log('🧪 Testing percentile lookup...\n');

  const testValue = 3000;
  const { data: testResult } = await supabase.rpc('lookup_percentile', {
    p_value: testValue,
    p_metric_column: 'net_peak_vertical_force_trial_value',
    p_play_level: 'College'
  });

  console.log(`  lookup_percentile(${testValue}, 'net_peak_vertical_force_trial_value', 'College')`);
  console.log(`  Result: ${testResult}th percentile\n`);

  console.log('🎉 Done! Percentile lookups are ready to use!\n');
  console.log('Usage:');
  console.log(`  SELECT lookup_percentile(value, 'metric_column', 'play_level');`);
  console.log('  Example: SELECT lookup_percentile(2500, \'net_peak_vertical_force_trial_value\', \'College\');\n');
}

main().catch(console.error);
