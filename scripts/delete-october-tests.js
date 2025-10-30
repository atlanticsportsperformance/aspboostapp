const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteOctoberTests() {
  console.log('🗑️  Deleting test data from October 1st, 2025...');
  console.log('(Checking recorded_utc field for 2025-10-01)');
  console.log('');

  const targetDate = '2025-10-01';
  const tables = ['cmj_tests', 'hj_tests', 'sj_tests', 'imtp_tests', 'ppu_tests'];

  for (const table of tables) {
    console.log(`📋 Checking ${table}...`);

    try {
      // Fetch tests from October 1st
      const { data: tests, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .gte('recorded_utc', `${targetDate}T00:00:00`)
        .lte('recorded_utc', `${targetDate}T23:59:59`);

      if (fetchError) {
        console.log(`❌ Error fetching ${table}:`, fetchError.message);
        console.log('');
        continue;
      }

      if (!tests || tests.length === 0) {
        console.log(`No tests found from ${targetDate}`);
        console.log('');
        continue;
      }

      console.log(`Found ${tests.length} test(s) from ${targetDate}`);

      // Show sample of what we're about to delete
      if (tests.length > 0) {
        console.log('Sample test:');
        console.log(`  - ID: ${tests[0].id}`);
        console.log(`  - Athlete ID: ${tests[0].athlete_id}`);
        console.log(`  - Recorded: ${tests[0].recorded_utc}`);
      }

      // Delete the tests
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .gte('recorded_utc', `${targetDate}T00:00:00`)
        .lte('recorded_utc', `${targetDate}T23:59:59`);

      if (deleteError) {
        console.log(`❌ Error deleting ${table}:`, deleteError.message);
      } else {
        console.log(`✅ Deleted ${tests.length} test(s) from ${table}`);
      }

    } catch (err) {
      console.log(`❌ Unexpected error with ${table}:`, err.message);
    }

    console.log('');
  }

  console.log('✅ Cleanup complete!');
}

deleteOctoberTests().catch(console.error);
