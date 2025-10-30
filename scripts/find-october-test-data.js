const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findOctoberTestData() {
  console.log('🔍 Searching for test data from October 1st, 2025...');
  console.log('');

  // Try different date formats since we don't know the exact column names
  const searchPatterns = [
    { date: '2025-10-01', label: 'October 1, 2025' },
  ];

  const tablesToCheck = [
    'cmj_tests',
    'imtp_tests',
    'nordic_tests',
    'nordics_tests',
    'force_plate_tests',
    'vald_tests'
  ];

  for (const table of tablesToCheck) {
    console.log(`\n📋 Checking table: ${table}`);
    console.log('─'.repeat(50));

    try {
      // First, try to get ALL records to see what dates exist
      const { data: allRecords, error: allError } = await supabase
        .from(table)
        .select('*')
        .limit(100);

      if (allError) {
        console.log(`❌ Error: ${allError.message}`);
        continue;
      }

      if (!allRecords || allRecords.length === 0) {
        console.log('No records found in this table');
        continue;
      }

      console.log(`Found ${allRecords.length} total records`);

      // Show a sample record to see the structure
      console.log('\nSample record structure:');
      console.log(JSON.stringify(allRecords[0], null, 2));

      // Try to find October records by checking various date fields
      const octoberRecords = allRecords.filter(record => {
        const recordStr = JSON.stringify(record);
        return recordStr.includes('2025-10-01') || recordStr.includes('2025-10');
      });

      if (octoberRecords.length > 0) {
        console.log(`\n⚠️  Found ${octoberRecords.length} record(s) from October:`);
        octoberRecords.forEach((record, idx) => {
          console.log(`\n[${idx + 1}] ID: ${record.id}`);
          console.log(`Created: ${record.created_at}`);
          if (record.test_date) console.log(`Test Date: ${record.test_date}`);
          if (record.date) console.log(`Date: ${record.date}`);
        });
      }

    } catch (err) {
      console.log(`❌ Unexpected error: ${err.message}`);
    }
  }

  console.log('\n\n✅ Search complete!');
}

findOctoberTestData().catch(console.error);
