/**
 * Check the distribution of percentile values to see why we have 19k rows
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📊 Analyzing Percentile Distribution\n');

  // Get total count
  const { count: totalCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`Total rows in percentile_lookup: ${totalCount}\n`);

  // Check one metric/level to see the pattern
  const { data: sample } = await supabase
    .from('percentile_lookup')
    .select('percentile, value')
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College')
    .order('percentile');

  console.log('Net Peak Force (College) - Percentile distribution:\n');

  if (sample) {
    // Group by percentile
    const grouped: Record<number, number> = {};
    sample.forEach(row => {
      grouped[row.percentile] = (grouped[row.percentile] || 0) + 1;
    });

    console.log(`Total unique values: ${sample.length}`);
    console.log(`Percentile range: ${Math.min(...sample.map(r => r.percentile))} to ${Math.max(...sample.map(r => r.percentile))}`);
    console.log(`\nPercentiles with multiple values:`);

    for (const [percentile, count] of Object.entries(grouped)) {
      if (count > 1) {
        console.log(`  ${percentile}th percentile: ${count} different values`);
      }
    }

    console.log(`\nSample values:`);
    for (let i = 0; i < Math.min(20, sample.length); i++) {
      console.log(`  ${sample[i].value.toFixed(2).padStart(10)} N → ${sample[i].percentile}th percentile`);
    }
  }

  console.log('\n\n🤔 The Issue:\n');
  console.log('We are storing a lookup row for EVERY unique athlete value.');
  console.log('This means ~1900 athletes × 8 metrics × 5 levels = ~76,000 possible rows.\n');

  console.log('What you expected: 8 metrics × 5 levels × 100 percentile points = 4,000 rows\n');

  console.log('The current system works fine for lookups, but it\'s storing way more data than needed.\n');
  console.log('Options:');
  console.log('  1. Keep it as-is (works perfectly, just uses more storage)');
  console.log('  2. Store only the 100 percentile points (0-99) with threshold values');
  console.log('  3. Store percentile ranges (e.g., every 5th percentile)\n');
}

main().catch(console.error);
