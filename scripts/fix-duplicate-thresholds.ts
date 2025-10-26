/**
 * Fix duplicate threshold values by removing the UNIQUE constraint on value
 * The constraint should be on (metric_column, play_level, percentile) instead
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔧 Fixing Duplicate Threshold Constraint\n');

  console.log('The issue: Multiple percentiles can have the SAME threshold value');
  console.log('Example: If 20 athletes all scored 3,000 N, then percentiles 50-69 might all have threshold = 3,000 N\n');

  console.log('Solution: Change UNIQUE constraint from (metric, level, value) to (metric, level, percentile)\n');

  // Check current constraint
  const { data: constraints } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'percentile_lookup'::regclass
        AND conname LIKE '%unique%'
      `
    });

  console.log('Current constraints:');
  console.log(constraints);

  console.log('\n\nTo fix this, run the following SQL in Supabase Dashboard:\n');
  console.log('---------------------------------------------------');
  console.log(`
-- Drop old UNIQUE constraint on value
ALTER TABLE percentile_lookup
DROP CONSTRAINT IF EXISTS percentile_lookup_metric_column_play_level_value_key;

-- Add new UNIQUE constraint on percentile
ALTER TABLE percentile_lookup
ADD CONSTRAINT percentile_lookup_metric_level_percentile_key
UNIQUE (metric_column, play_level, percentile);
  `.trim());
  console.log('---------------------------------------------------\n');

  console.log('After running the SQL, re-run: npx tsx scripts/recalculate-all-percentiles-threshold-only.ts\n');
}

main().catch(console.error);
