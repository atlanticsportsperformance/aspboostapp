import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Checking athlete_percentile_contributions columns...\n');

  // Compare both tables
  const tables = ['athlete_percentile_contributions', 'driveline_seed_data'];

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .limit(0); // Get 0 rows, just the structure

    // This will fail but the error contains column info, OR
    // we can check the response structure

    // Alternative: just try selecting all columns
    const { data: sample, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log(`❌ ${table}: Table not found\n`);
      continue;
    }

    // If sample exists or is empty array, we can infer columns from the query
    console.log(`\n✅ ${table}:`);

    if (sample && sample.length > 0) {
      const cols = Object.keys(sample[0]);
      const metrics = cols.filter(c => c.includes('trial_value') || c.includes('asymm_value'));
      console.log(`  Total columns: ${cols.length}`);
      console.log(`  Metric columns: ${metrics.length}`);
      console.log(`  First 10 metric columns:`);
      metrics.slice(0, 10).forEach(c => console.log(`    - ${c}`));
    } else {
      console.log('  (Empty table - trying alternate method)');

      // Try getting column info via RPC or raw query
      const { data: info } = await supabase.rpc('exec_sql', {
        sql_string: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = '${table}'
          AND column_name LIKE '%trial_value%' OR column_name LIKE '%asymm_value%'
          ORDER BY ordinal_position;
        `
      }).catch(() => ({ data: null }));

      if (info) {
        console.log(`  Metric columns from schema: ${info.length}`);
      } else {
        console.log('  Could not determine schema');
      }
    }
  }
}

main();
