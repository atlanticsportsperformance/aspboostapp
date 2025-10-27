import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function deleteScottTests() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const scottId = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

  console.log('\n=== Deleting Scott\'s Test Data for Full Re-sync ===\n');

  const tables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete()
      .eq('athlete_id', scottId);

    if (error) {
      console.error(`❌ Error deleting from ${table}:`, error.message);
    } else {
      console.log(`✅ Deleted from ${table}: ${count || 0} row(s)`);
    }
  }

  console.log('\n✅ All test data deleted. Run sync again to pull all tests from VALD.');
}

deleteScottTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
