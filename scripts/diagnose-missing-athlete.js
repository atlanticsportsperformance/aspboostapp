const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const missingAthleteId = '90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9';

async function diagnoseMissingAthlete() {
  console.log('=== DIAGNOSING MISSING ATHLETE ===\n');
  console.log(`Athlete ID: ${missingAthleteId}\n`);

  // 1. Check athlete details
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('id', missingAthleteId)
    .single();

  if (athleteError) {
    console.error('❌ ERROR: Athlete not found in athletes table!');
    console.error(athleteError);
    return;
  }

  console.log('1. ATHLETE DETAILS:');
  console.log(`   Name: ${athlete.first_name} ${athlete.last_name}`);
  console.log(`   Play Level: ${athlete.play_level || 'NOT SET'}`);
  console.log('');

  if (!athlete.play_level) {
    console.log('❌ ISSUE: Athlete has NO play_level set!');
    console.log('The backfill script requires play_level to be set.\n');
    return;
  }

  if (athlete.play_level !== 'Youth') {
    console.log(`❌ ISSUE: Athlete play_level is "${athlete.play_level}", not "Youth"!`);
    console.log('The data you provided shows Youth tests, but the athlete record has a different play_level.\n');
    return;
  }

  console.log('✅ Athlete has correct play_level: Youth\n');

  // 2. Check test counts
  const testTypes = [
    { type: 'CMJ', table: 'cmj_tests' },
    { type: 'SJ', table: 'sj_tests' },
    { type: 'HJ', table: 'hj_tests' },
    { type: 'PPU', table: 'ppu_tests' },
    { type: 'IMTP', table: 'imtp_tests' }
  ];

  console.log('2. TEST COUNTS IN DATABASE:\n');

  for (const { type, table } of testTypes) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', missingAthleteId);

    if (error) {
      console.log(`   ${type}: Error - ${error.message}`);
    } else {
      const shouldContribute = count >= 2 ? '✅ Should contribute' : '❌ Too few';
      console.log(`   ${type}: ${count} test${count !== 1 ? 's' : ''} ${shouldContribute}`);
    }
  }

  console.log('');

  // 3. Check specific tests
  console.log('3. CHECKING SPECIFIC TESTS:\n');

  // CMJ tests
  const { data: cmjTests } = await supabase
    .from('cmj_tests')
    .select('test_id, recorded_utc, peak_takeoff_power_trial_value')
    .eq('athlete_id', missingAthleteId)
    .order('recorded_utc', { ascending: true });

  if (cmjTests && cmjTests.length > 0) {
    console.log(`   CMJ Tests (${cmjTests.length}):`);
    cmjTests.forEach((test, idx) => {
      console.log(`      ${idx + 1}. ${test.recorded_utc} - Power: ${test.peak_takeoff_power_trial_value}W`);
    });
    console.log('');
  }

  // SJ tests
  const { data: sjTests } = await supabase
    .from('sj_tests')
    .select('test_id, recorded_utc, peak_takeoff_power_trial_value')
    .eq('athlete_id', missingAthleteId)
    .order('recorded_utc', { ascending: true });

  if (sjTests && sjTests.length > 0) {
    console.log(`   SJ Tests (${sjTests.length}):`);
    sjTests.forEach((test, idx) => {
      console.log(`      ${idx + 1}. ${test.recorded_utc} - Power: ${test.peak_takeoff_power_trial_value}W`);
    });
    console.log('');
  }

  // HJ tests
  const { data: hjTests } = await supabase
    .from('hj_tests')
    .select('test_id, recorded_utc, reactive_strength_index')
    .eq('athlete_id', missingAthleteId)
    .order('recorded_utc', { ascending: true });

  if (hjTests && hjTests.length > 0) {
    console.log(`   HJ Tests (${hjTests.length}):`);
    hjTests.forEach((test, idx) => {
      console.log(`      ${idx + 1}. ${test.recorded_utc} - RSI: ${test.reactive_strength_index}`);
    });
    console.log('');
  }

  // PPU tests
  const { data: ppuTests } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc, peak_takeoff_force_trial_value')
    .eq('athlete_id', missingAthleteId)
    .order('recorded_utc', { ascending: true });

  if (ppuTests && ppuTests.length > 0) {
    console.log(`   PPU Tests (${ppuTests.length}):`);
    ppuTests.forEach((test, idx) => {
      console.log(`      ${idx + 1}. ${test.recorded_utc} - Force: ${test.peak_takeoff_force_trial_value}N`);
    });
    console.log('');
  }

  // 4. Check contributions
  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', missingAthleteId);

  console.log('4. CONTRIBUTIONS IN DATABASE:\n');
  if (!contributions || contributions.length === 0) {
    console.log('   ❌ NO CONTRIBUTIONS FOUND\n');
  } else {
    console.log(`   Found ${contributions.length} contributions:`);
    contributions.forEach(c => {
      console.log(`      ${c.test_type} - ${c.test_date}`);
    });
    console.log('');
  }

  // 5. Summary
  console.log('=== DIAGNOSIS SUMMARY ===\n');

  const expectedContributions = [];
  if (cmjTests && cmjTests.length >= 2) expectedContributions.push('CMJ');
  if (sjTests && sjTests.length >= 2) expectedContributions.push('SJ');
  if (hjTests && hjTests.length >= 2) expectedContributions.push('HJ');
  if (ppuTests && ppuTests.length >= 2) expectedContributions.push('PPU');

  if (expectedContributions.length > 0) {
    console.log(`Expected contributions: ${expectedContributions.join(', ')}`);
    console.log(`Actual contributions: ${contributions?.length || 0}`);
    console.log('');

    if (!contributions || contributions.length === 0) {
      console.log('❌ ISSUE: Tests exist but no contributions were created.');
      console.log('');
      console.log('POSSIBLE CAUSES:');
      console.log('1. Backfill script needs to be run');
      console.log('2. Backfill script has a bug or failed silently');
      console.log('3. Tests were synced AFTER backfill was run (triggers not deployed)');
      console.log('');
      console.log('SOLUTION:');
      console.log('Run the backfill script again: scripts/backfill-contributions.sql');
    }
  } else {
    console.log('ℹ️  No contributions expected (athlete doesn\'t have 2+ tests for any type)');
  }
}

diagnoseMissingAthlete().catch(console.error);
