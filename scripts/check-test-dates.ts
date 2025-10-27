import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkTestDates() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n=== Checking Test Dates for Scott ===\n');

  const tables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('recorded_utc, test_id')
      .eq('athlete_id', 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f')
      .order('recorded_utc', { ascending: false });

    if (error) {
      console.log(`${table}: Error - ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`${table}: No tests found`);
      continue;
    }

    console.log(`${table}: ${data.length} test(s)`);
    console.log(`  Latest: ${data[0].recorded_utc}`);
    console.log(`  Oldest: ${data[data.length - 1].recorded_utc}`);
    console.log('');
  }
}

checkTestDates()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
