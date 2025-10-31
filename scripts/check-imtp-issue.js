// Check IMTP data flow - what's stored, what's not, and where it's breaking

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIMTPIssue() {
  console.log('🔍 Checking IMTP data flow...\n');

  // 1. Check if any IMTP tests exist
  const { data: imtpTests, error: imtpError } = await supabase
    .from('imtp_tests')
    .select('*')
    .order('recorded_utc', { ascending: false })
    .limit(5);

  console.log('1️⃣ Recent IMTP tests:');
  if (imtpError) {
    console.error('   ERROR:', imtpError.message);
  } else if (!imtpTests || imtpTests.length === 0) {
    console.log('   ❌ NO IMTP TESTS FOUND');
  } else {
    console.log(`   ✅ Found ${imtpTests.length} recent IMTP tests`);
    imtpTests.forEach(test => {
      console.log(`   - Test ID: ${test.test_id}, Athlete: ${test.athlete_id}, Date: ${test.recorded_utc}`);
      console.log(`     Net Peak Force: ${test.net_peak_vertical_force_trial_value}`);
      console.log(`     Relative Strength: ${test.relative_strength_trial_value}`);
    });
  }

  // 2. Check if IMTP percentile history exists
  const { data: imtpHistory, error: historyError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('test_type', 'IMTP')
    .order('test_date', { ascending: false })
    .limit(5);

  console.log('\n2️⃣ IMTP percentile history:');
  if (historyError) {
    console.error('   ERROR:', historyError.message);
  } else if (!imtpHistory || imtpHistory.length === 0) {
    console.log('   ❌ NO IMTP PERCENTILE HISTORY FOUND');
  } else {
    console.log(`   ✅ Found ${imtpHistory.length} IMTP percentile history records`);
    imtpHistory.forEach(record => {
      console.log(`   - Athlete: ${record.athlete_id}, Date: ${record.test_date}`);
      console.log(`     Net Peak Force: ${record.net_peak_vertical_force_trial_value} (${record.net_peak_vertical_force_percentile}th percentile)`);
      console.log(`     Relative Strength: ${record.relative_strength_trial_value} (${record.relative_strength_percentile}th percentile)`);
    });
  }

  // 3. Check if IMTP contributions exist
  const { data: imtpContributions, error: contribError } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('test_type', 'IMTP');

  console.log('\n3️⃣ IMTP percentile contributions:');
  if (contribError) {
    console.error('   ERROR:', contribError.message);
  } else if (!imtpContributions || imtpContributions.length === 0) {
    console.log('   ⚠️  NO IMTP CONTRIBUTIONS (this is OK if athletes only have 1 test each)');
  } else {
    console.log(`   ✅ Found ${imtpContributions.length} IMTP contribution records`);
  }

  // 4. Check what columns exist in athlete_percentile_contributions
  const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'athlete_percentile_contributions'
      ORDER BY ordinal_position;
    `
  }).catch(() => null);

  console.log('\n4️⃣ Columns in athlete_percentile_contributions:');
  console.log('   (Using direct query since RPC might not be available)');

  // 5. Check for recent errors in logs (if we can access them)
  console.log('\n5️⃣ Summary:');
  if (!imtpTests || imtpTests.length === 0) {
    console.log('   ❌ PROBLEM: No IMTP tests are being stored');
    console.log('   → Check if storeIMTPTest() is being called');
    console.log('   → Check for errors during VALD sync');
  } else if (!imtpHistory || imtpHistory.length === 0) {
    console.log('   ❌ PROBLEM: IMTP tests exist but no percentile history');
    console.log('   → Check if saveTestPercentileHistory() is being called for IMTP');
    console.log('   → Check percentile lookup tables have IMTP data');
  } else {
    console.log('   ✅ IMTP data flow looks OK');
  }

  console.log('\n📝 Next steps:');
  console.log('   1. Try syncing VALD data for an athlete with IMTP tests');
  console.log('   2. Check server logs for "Error storing IMTP test" messages');
  console.log('   3. If you see jump_height_trial_value errors, we need to fix the trigger/function');
}

checkIMTPIssue().catch(console.error);
