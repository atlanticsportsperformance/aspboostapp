const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYouthContributions() {
  const athleteId = 'cb209d13-4509-4b36-94e3-0f49b5312b79';

  console.log('=== CHECKING YOUTH ATHLETE CONTRIBUTIONS ===\n');

  // 1. Check athlete details
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('id', athleteId)
    .single();

  if (athleteError) {
    console.error('Error fetching athlete:', athleteError);
    return;
  }

  console.log('1. ATHLETE DETAILS:');
  console.log(athlete);
  console.log('');

  // 2. Check test counts
  const { data: cmjTests, error: cmjError } = await supabase
    .from('cmj_tests')
    .select('test_id, recorded_utc, peak_takeoff_power_trial_value, bodymass_relative_takeoff_power_trial_value')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false });

  const { data: sjTests, error: sjError } = await supabase
    .from('sj_tests')
    .select('test_id, recorded_utc, peak_takeoff_power_trial_value, bodymass_relative_takeoff_power_trial_value')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false });

  const { data: hjTests, error: hjError } = await supabase
    .from('hj_tests')
    .select('test_id, recorded_utc, reactive_strength_index')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false });

  const { data: ppuTests, error: ppuError } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc, peak_takeoff_force_trial_value')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false });

  const { data: imtpTests, error: imtpError } = await supabase
    .from('imtp_tests')
    .select('test_id, recorded_utc, net_peak_force, relative_strength')
    .eq('athlete_id', athleteId)
    .order('recorded_utc', { ascending: false });

  console.log('2. TEST COUNTS:');
  console.log(`   CMJ: ${cmjTests?.length || 0} tests`);
  console.log(`   SJ: ${sjTests?.length || 0} tests`);
  console.log(`   HJ: ${hjTests?.length || 0} tests`);
  console.log(`   PPU: ${ppuTests?.length || 0} tests`);
  console.log(`   IMTP: ${imtpTests?.length || 0} tests`);
  console.log('');

  // 3. Show test details
  if (cmjTests && cmjTests.length > 0) {
    console.log('3. CMJ TEST DETAILS (most recent first):');
    cmjTests.forEach((test, idx) => {
      console.log(`   Test ${idx + 1}: ${test.recorded_utc}`);
      console.log(`      Peak Power: ${test.peak_takeoff_power_trial_value}`);
      console.log(`      Peak Power/BM: ${test.bodymass_relative_takeoff_power_trial_value}`);
    });
    console.log('');
  }

  if (sjTests && sjTests.length > 0) {
    console.log('4. SJ TEST DETAILS (most recent first):');
    sjTests.forEach((test, idx) => {
      console.log(`   Test ${idx + 1}: ${test.recorded_utc}`);
      console.log(`      Peak Power: ${test.peak_takeoff_power_trial_value}`);
      console.log(`      Peak Power/BM: ${test.bodymass_relative_takeoff_power_trial_value}`);
    });
    console.log('');
  }

  // 4. Check contributions table
  const { data: contributions, error: contribError } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', athleteId);

  console.log('5. CONTRIBUTIONS TABLE:');
  if (!contributions || contributions.length === 0) {
    console.log('   ❌ NO CONTRIBUTIONS FOUND');
  } else {
    console.log(`   ✅ Found ${contributions.length} contributions:`);
    contributions.forEach(c => {
      console.log(`      ${c.test_type} - ${c.playing_level} - ${c.test_date}`);
    });
  }
  console.log('');

  // 5. Check percentile_history table
  const { data: history, error: historyError } = await supabase
    .from('athlete_percentile_history')
    .select('test_type, metric_name, percentile_play_level')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('6. RECENT PERCENTILE HISTORY (last 10):');
  if (history && history.length > 0) {
    history.forEach(h => {
      console.log(`   ${h.test_type} - ${h.metric_name}: ${h.percentile_play_level}th percentile`);
    });
  }
  console.log('');

  // 6. Check if triggers exist
  const { data: triggers, error: triggerError } = await supabase.rpc('check_trigger_exists', {
    table_name: 'cmj_tests',
    trigger_name: 'trigger_cmj_contribution'
  }).catch(() => null);

  console.log('7. TRIGGER STATUS:');
  console.log('   Checking if SQL triggers are deployed...');
  console.log('   (If this section is empty, triggers likely do NOT exist yet)');
  console.log('');

  // 7. Diagnostic summary
  console.log('=== DIAGNOSTIC SUMMARY ===');
  console.log('');

  if (!athlete.play_level) {
    console.log('❌ ISSUE: Athlete has no play_level set!');
  } else {
    console.log(`✅ Athlete play_level: ${athlete.play_level}`);
  }

  const totalTests = (cmjTests?.length || 0) + (sjTests?.length || 0) + (hjTests?.length || 0) +
                      (ppuTests?.length || 0) + (imtpTests?.length || 0);

  if (totalTests < 2) {
    console.log('❌ ISSUE: Athlete has less than 2 tests total');
  } else {
    console.log(`✅ Athlete has ${totalTests} total tests`);
  }

  if (!contributions || contributions.length === 0) {
    console.log('❌ ISSUE: No contributions found in athlete_percentile_contributions table');
    console.log('');
    console.log('LIKELY CAUSES:');
    console.log('1. SQL triggers have not been deployed yet');
    console.log('2. Tests were inserted BEFORE triggers were created');
    console.log('3. Backfill script has not been run yet');
    console.log('');
    console.log('SOLUTION:');
    console.log('1. Run: scripts/setup-percentile-contributions-triggers.sql');
    console.log('2. Run: scripts/backfill-contributions.sql');
  } else {
    console.log('✅ Contributions exist');
  }

  console.log('');
  console.log('=== END DIAGNOSTIC ===');
}

checkYouthContributions().catch(console.error);
