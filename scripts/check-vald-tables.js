const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkValdTables() {
  console.log('🔍 Checking VALD-related data for Lincoln Beliveau...');
  console.log('');

  const athleteId = 'dd036079-556c-4fb3-90ab-2614f3a6667a';
  const valdProfileId = 'b341abcb-3ecb-408f-b7c1-027b542c008f';

  // Check athlete record
  const { data: athlete } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .single();

  console.log('👤 Athlete Record:');
  console.log(JSON.stringify(athlete, null, 2));
  console.log('');

  // Check cmj_tests table
  const { data: cmjTests, error: cmjError } = await supabase
    .from('cmj_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('test_date', { ascending: false })
    .limit(5);

  console.log('🦘 CMJ Tests:');
  if (cmjTests && cmjTests.length > 0) {
    console.log(`Found ${cmjTests.length} CMJ test(s):`);
    cmjTests.forEach((test, idx) => {
      console.log(`\n[${idx + 1}] Test Date: ${test.test_date}, Jump Height: ${test.jump_height_cm} cm`);
    });
  } else {
    console.log('No CMJ tests found');
    if (cmjError) console.log('Error:', cmjError.message);
  }
  console.log('');

  // Check nordics_tests table
  const { data: nordicTests, error: nordicError } = await supabase
    .from('nordics_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('test_date', { ascending: false })
    .limit(5);

  console.log('🏃 Nordic Tests:');
  if (nordicTests && nordicTests.length > 0) {
    console.log(`Found ${nordicTests.length} Nordic test(s):`);
    nordicTests.forEach((test, idx) => {
      console.log(`\n[${idx + 1}] Test Date: ${test.test_date}`);
    });
  } else {
    console.log('No Nordic tests found');
    if (nordicError) console.log('Error:', nordicError.message);
  }
  console.log('');

  // Check imtp_tests table
  const { data: imtpTests, error: imtpError } = await supabase
    .from('imtp_tests')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('test_date', { ascending: false })
    .limit(5);

  console.log('💪 IMTP Tests:');
  if (imtpTests && imtpTests.length > 0) {
    console.log(`Found ${imtpTests.length} IMTP test(s):`);
    imtpTests.forEach((test, idx) => {
      console.log(`\n[${idx + 1}] Test Date: ${test.test_date}`);
    });
  } else {
    console.log('No IMTP tests found');
    if (imtpError) console.log('Error:', imtpError.message);
  }
  console.log('');

  // Search for this vald_profile_id in ALL athletes
  const { data: athletesWithSameValdId } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, vald_profile_id')
    .eq('vald_profile_id', valdProfileId);

  console.log('🔗 Athletes with same VALD Profile ID:');
  if (athletesWithSameValdId && athletesWithSameValdId.length > 0) {
    console.log(`Found ${athletesWithSameValdId.length} athlete(s) with this VALD profile ID:`);
    athletesWithSameValdId.forEach((ath, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log(JSON.stringify(ath, null, 2));
    });
  } else {
    console.log('No other athletes found with this VALD profile ID');
  }
}

checkValdTables().catch(console.error);
