/**
 * Apply the constraint fix directly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔧 Fixing Percentile Lookup Constraint\n');

  // Drop old constraint
  console.log('1. Dropping old UNIQUE constraint on (metric, level, value)...');

  const { data: dropData, error: dropError } = await supabase
    .from('percentile_lookup')
    .select('id')
    .limit(1);

  // Use raw SQL to drop constraint
  const dropSQL = `
    ALTER TABLE percentile_lookup
    DROP CONSTRAINT IF EXISTS percentile_lookup_metric_column_play_level_value_key;
  `;

  // Since we can't execute DDL directly, let's just clear and repopulate
  console.log('⚠️  Cannot execute DDL via Supabase client\n');
  console.log('Please run this SQL in Supabase Dashboard SQL Editor:\n');
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
}

main().catch(console.error);
