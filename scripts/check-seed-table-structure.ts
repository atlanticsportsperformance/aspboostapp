import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Try to get columns via RPC or information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'driveline_seed_data'
      ORDER BY ordinal_position;
    `
  }).catch(() => ({ data: null, error: null }));

  if (!data) {
    // Try direct query approach
    console.log('Checking driveline_seed_data structure...\n');

    const { data: sample, error: sampleError } = await supabase
      .from('driveline_seed_data')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('Error:', sampleError.message);
    } else if (!sample || sample.length === 0) {
      console.log('Table exists but is empty. Cannot determine columns.');
    } else {
      console.log('Columns in driveline_seed_data:');
      Object.keys(sample[0]).forEach(col => console.log(`  - ${col}`));
    }
  }
}

main();
