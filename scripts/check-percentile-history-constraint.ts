/**
 * Check the unique constraint on athlete_percentile_history table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  // Query to get all constraints on the table
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'athlete_percentile_history'::regclass
      ORDER BY conname;
    `
  });

  if (error) {
    console.error('RPC not available, trying direct query via pg_catalog...');

    // Alternative: Check indexes which might reveal unique constraints
    const { data: indexes } = await supabase
      .from('athlete_percentile_history')
      .select('*')
      .limit(1);

    console.log('\nSample row from table:');
    console.log(JSON.stringify(indexes, null, 2));

    // Try to manually query the schema
    console.log('\nPlease run this SQL in Supabase SQL Editor to see constraints:');
    console.log(`
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'athlete_percentile_history'::regclass
ORDER BY conname;
    `);
    return;
  }

  console.log('Constraints on athlete_percentile_history:');
  console.log(JSON.stringify(data, null, 2));
}

checkConstraints().catch(console.error);
