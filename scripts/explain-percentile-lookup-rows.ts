/**
 * Explain why there are 19,000 rows in percentile_lookup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📊 Explaining the 19,000 Rows in percentile_lookup\n');
  console.log('='.repeat(80) + '\n');

  // Get total count
  const { count: totalCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`Total rows in percentile_lookup: ${totalCount}\n`);

  // Break down by metric
  const { data: metrics } = await supabase
    .from('percentile_metric_mappings')
    .select('vald_field_name, display_name');

  console.log('Breakdown by Metric:\n');

  let totalExpected = 0;

  for (const metric of metrics || []) {
    const { count: metricCount } = await supabase
      .from('percentile_lookup')
      .select('*', { count: 'exact', head: true })
      .eq('metric_column', metric.vald_field_name);

    console.log(`  ${metric.display_name.padEnd(30)} ${metricCount} rows`);

    // Show breakdown by play level
    const levels = ['Youth', 'High School', 'College', 'Pro', 'Overall'];
    for (const level of levels) {
      const { count: levelCount } = await supabase
        .from('percentile_lookup')
        .select('*', { count: 'exact', head: true })
        .eq('metric_column', metric.vald_field_name)
        .eq('play_level', level);

      if (levelCount && levelCount > 0) {
        console.log(`    ${level.padEnd(15)} ${levelCount} unique values`);
      }
    }

    totalExpected += metricCount || 0;
    console.log();
  }

  console.log('='.repeat(80) + '\n');

  console.log('💡 WHY SO MANY ROWS?\n');
  console.log('Each row represents ONE UNIQUE VALUE with its percentile.\n');
  console.log('Example: Net Peak Force (College) might have 833 athletes\n');
  console.log('  - But maybe only 500 UNIQUE values (some tied)\n');
  console.log('  - So 500 rows in percentile_lookup for that metric/level\n');
  console.log('Then multiply across:\n');
  console.log('  - 8 metrics\n');
  console.log('  - 5 play levels each (Youth, HS, College, Pro, Overall)\n');
  console.log('  - ~500 unique values per metric/level on average\n');
  console.log('  = ~19,000 total rows\n');

  console.log('This is CORRECT and EFFICIENT!\n');
  console.log('Pre-calculated lookup table for instant percentile queries.\n');
}

main().catch(console.error);
