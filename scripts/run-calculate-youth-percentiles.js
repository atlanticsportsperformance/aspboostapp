/**
 * Calculate Youth percentiles from athlete_percentile_contributions
 *
 * This script reads the SQL file and executes it against Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCalculation() {
  console.log('=== CALCULATING YOUTH PERCENTILES ===\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'calculate-youth-percentiles.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('1. Checking current Youth contributions...');

  // Count by test type
  const { data: contributionCounts } = await supabase
    .from('athlete_percentile_contributions')
    .select('test_type')
    .eq('playing_level', 'Youth');

  const testTypeCounts = {};
  contributionCounts?.forEach(c => {
    testTypeCounts[c.test_type] = (testTypeCounts[c.test_type] || 0) + 1;
  });

  console.log('\nYouth Contributions by Test Type:');
  Object.entries(testTypeCounts).forEach(([testType, count]) => {
    console.log(`   ${testType}: ${count} athletes`);
  });
  console.log('');

  if (Object.keys(testTypeCounts).length === 0) {
    console.error('❌ ERROR: No Youth contributions found!');
    console.log('');
    console.log('Make sure you have:');
    console.log('1. Run the backfill-contributions.sql script');
    console.log('2. Have Youth athletes with 2+ tests in your database');
    return;
  }

  console.log('2. Executing percentile calculation...\n');

  // Note: Supabase JS client doesn't support running multi-statement SQL directly
  // We need to execute this SQL via Supabase SQL Editor or use a PostgreSQL client

  console.log('⚠️  IMPORTANT: The Supabase JS client cannot execute multi-statement SQL.');
  console.log('');
  console.log('To calculate Youth percentiles, you need to:');
  console.log('');
  console.log('OPTION 1: Use Supabase SQL Editor (recommended)');
  console.log('   1. Open Supabase Dashboard');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Copy the contents of: scripts/calculate-youth-percentiles.sql');
  console.log('   4. Paste and run the SQL');
  console.log('');
  console.log('OPTION 2: Use psql command line');
  console.log('   npx psql <database-url> -f scripts/calculate-youth-percentiles.sql');
  console.log('');
  console.log('After running the SQL, run this script again to verify:');
  console.log('   node -r dotenv/config scripts/check-percentile-lookup.js dotenv_config_path=.env.local');
  console.log('');

  // Let's at least show what the SQL will do
  console.log('=== SQL PREVIEW ===');
  console.log(sql.substring(0, 500) + '...\n');
}

runCalculation().catch(console.error);
