/**
 * Check Cameron Hohmann's Force Profile data in detail
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCameronForceProfile() {
  const athleteId = 'fc6ad90a-0db4-459d-b34a-9e9a68f00b8e';

  console.log('\n📊 Cameron Hohmann Force Profile Analysis\n');
  console.log('='.repeat(80));

  // Get Force Profile entries
  const { data: forceProfiles, error: fpError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('test_type', 'FORCE_PROFILE')
    .order('test_date', { ascending: false });

  if (fpError) {
    console.error('Error:', fpError);
    return;
  }

  console.log(`\nForce Profile Entries (${forceProfiles.length} total):\n`);

  for (const fp of forceProfiles) {
    console.log(`Date: ${new Date(fp.test_date).toLocaleString()}`);
    console.log(`  Play Level: ${fp.play_level}`);
    console.log(`  Percentile (Play Level): ${fp.percentile_play_level}`);
    console.log(`  Percentile (Overall): ${fp.percentile_overall}`);
    console.log('');
  }

  // Get all SJ, HJ, PPU, IMTP tests (the components of Force Profile)
  const { data: componentTests, error: compError } = await supabase
    .from('athlete_percentile_history')
    .select('test_type, metric_name, test_date, value, percentile_play_level')
    .eq('athlete_id', athleteId)
    .eq('play_level', 'High School')
    .in('test_type', ['SJ', 'HJ', 'PPU', 'IMTP'])
    .order('test_date', { ascending: false });

  if (compError) {
    console.error('Error:', compError);
    return;
  }

  console.log(`\nComponent Test History (${componentTests.length} entries):\n`);

  // Group by date
  const byDate = {};
  for (const test of componentTests) {
    const dateKey = test.test_date.split('T')[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(test);
  }

  for (const [date, tests] of Object.entries(byDate)) {
    console.log(`${date}:`);
    const grouped = {};
    for (const test of tests) {
      if (!grouped[test.test_type]) {
        grouped[test.test_type] = [];
      }
      grouped[test.test_type].push(test);
    }
    for (const [testType, typeTests] of Object.entries(grouped)) {
      console.log(`  ${testType}: ${typeTests.length} metrics`);
      for (const t of typeTests) {
        console.log(`    ${t.metric_name}: ${t.value} (${t.percentile_play_level}th)`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('\n🔍 DIAGNOSIS:\n');

  // Check if Force Profile dates align with test dates
  const forceProfileDates = forceProfiles.map(fp => fp.test_date.split('T')[0]);
  const testDates = Object.keys(byDate);

  console.log('Force Profile Dates:', forceProfileDates);
  console.log('Test Dates:', testDates);

  for (const fpDate of forceProfileDates) {
    if (testDates.includes(fpDate)) {
      console.log(`✅ ${fpDate}: Force Profile aligns with test date`);
    } else {
      console.log(`⚠️  ${fpDate}: Force Profile exists but no tests on this date?`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkCameronForceProfile().catch(console.error);
