/**
 * Test the new threshold-only percentile logic
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🧪 Testing Threshold-Only Percentile Logic\n');

  // Get all values for one metric/level
  const { data: allValues } = await supabase
    .from('driveline_seed_data')
    .select('net_peak_vertical_force_trial_value')
    .eq('playing_level', 'College')
    .not('net_peak_vertical_force_trial_value', 'is', null)
    .order('net_peak_vertical_force_trial_value');

  if (!allValues) {
    console.log('No data found');
    return;
  }

  const values = allValues.map(v => v.net_peak_vertical_force_trial_value).sort((a, b) => a - b);
  const total = values.length;

  console.log(`Net Peak Force (College):`);
  console.log(`  Total values: ${total}\n`);

  console.log('Expected thresholds for each percentile:\n');

  for (let percentile of [0, 1, 10, 25, 50, 75, 90, 99, 100]) {
    const targetRank = Math.floor((percentile / 100) * total);
    const threshold = values[targetRank];

    console.log(`  ${percentile.toString().padStart(3)}th percentile → ${threshold.toFixed(2).padStart(10)} N (rank ${targetRank}/${total})`);
  }

  console.log('\n\n📊 After migration, we should have:\n');
  console.log('  8 metrics × 5 play levels × 101 percentiles (0-100) = 4,040 rows');
  console.log('\n  Instead of current 19,015 rows (every unique value)\n');
}

main().catch(console.error);
