/**
 * Analyze why Colin Ma only has 1 contribution (IMTP) when he completed 2 test days for all 5 tests
 */

import { createClient } from '@supabase/supabase-js';

async function analyzeColinContributions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Analyzing Colin Ma\'s percentile contributions...\n');

  // 1. Find Colin Ma
  const { data: colin, error: colinError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (colinError || !colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}`);
  console.log(`   ID: ${colin.id}`);
  console.log(`   Play Level: ${colin.play_level}\n`);

  // 2. Check current contributions
  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', colin.id);

  console.log(`📊 Current Contributions: ${contributions?.length || 0}`);
  if (contributions && contributions.length > 0) {
    contributions.forEach(c => {
      console.log(`   - ${c.test_type} (${c.playing_level}) on ${c.test_date}`);
    });
  }
  console.log('');

  // 3. Check CMJ tests
  const { data: cmjTests } = await supabase
    .from('cmj_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: true });

  console.log(`🏃 CMJ Tests: ${cmjTests?.length || 0}`);
  if (cmjTests) {
    cmjTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.test_id} - ${new Date(t.recorded_utc).toLocaleDateString()}`);
    });
  }
  console.log('');

  // 4. Check SJ tests
  const { data: sjTests } = await supabase
    .from('sj_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: true });

  console.log(`🏃 SJ Tests: ${sjTests?.length || 0}`);
  if (sjTests) {
    sjTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.test_id} - ${new Date(t.recorded_utc).toLocaleDateString()}`);
    });
  }
  console.log('');

  // 5. Check HJ tests
  const { data: hjTests } = await supabase
    .from('hj_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: true });

  console.log(`🏃 HJ Tests: ${hjTests?.length || 0}`);
  if (hjTests) {
    hjTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.test_id} - ${new Date(t.recorded_utc).toLocaleDateString()}`);
    });
  }
  console.log('');

  // 6. Check PPU tests
  const { data: ppuTests } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: true });

  console.log(`🏃 PPU Tests: ${ppuTests?.length || 0}`);
  if (ppuTests) {
    ppuTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.test_id} - ${new Date(t.recorded_utc).toLocaleDateString()}`);
    });
  }
  console.log('');

  // 7. Check IMTP tests
  const { data: imtpTests } = await supabase
    .from('imtp_tests')
    .select('test_id, recorded_utc')
    .eq('athlete_id', colin.id)
    .order('recorded_utc', { ascending: true });

  console.log(`🏃 IMTP Tests: ${imtpTests?.length || 0}`);
  if (imtpTests) {
    imtpTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.test_id} - ${new Date(t.recorded_utc).toLocaleDateString()}`);
    });
  }
  console.log('');

  // 8. Analyze complete sessions by date
  console.log('📅 Analyzing Complete Sessions by Date:\n');

  const allTests: { date: string; type: string; test_id: string }[] = [];

  cmjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'CMJ', test_id: t.test_id }));
  sjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'SJ', test_id: t.test_id }));
  hjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'HJ', test_id: t.test_id }));
  ppuTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'PPU', test_id: t.test_id }));
  imtpTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'IMTP', test_id: t.test_id }));

  const testsByDate = allTests.reduce((acc, test) => {
    if (!acc[test.date]) {
      acc[test.date] = [];
    }
    acc[test.date].push(test);
    return acc;
  }, {} as Record<string, typeof allTests>);

  const sortedDates = Object.keys(testsByDate).sort();

  sortedDates.forEach((date, idx) => {
    const tests = testsByDate[date];
    const uniqueTypes = new Set(tests.map(t => t.type));
    const isComplete = uniqueTypes.size === 5;

    console.log(`Session ${idx + 1}: ${date} ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    console.log(`   Tests: ${Array.from(uniqueTypes).join(', ')} (${uniqueTypes.size}/5)`);

    if (!isComplete) {
      const missingTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'].filter(t => !uniqueTypes.has(t));
      console.log(`   Missing: ${missingTypes.join(', ')}`);
    }
    console.log('');
  });

  const completeSessions = sortedDates.filter(date => {
    const tests = testsByDate[date];
    const uniqueTypes = new Set(tests.map(t => t.type));
    return uniqueTypes.size === 5;
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total Test Days: ${sortedDates.length}`);
  console.log(`   Complete Sessions (all 5 tests): ${completeSessions.length}`);
  console.log(`   Should Contribute?: ${completeSessions.length >= 2 ? '✅ YES' : '❌ NO'}\n`);

  // 9. Explain the issue
  console.log('🔍 Analysis:');
  if (completeSessions.length >= 2) {
    console.log(`   ✅ Colin has ${completeSessions.length} complete sessions`);
    console.log(`   ✅ He SHOULD have contributions for all 5 test types`);
    console.log(`   ❌ But he only has ${contributions?.length || 0} contribution(s): ${contributions?.map(c => c.test_type).join(', ') || 'none'}`);
    console.log('');
    console.log('💡 ISSUE: The auto-contribution trigger is NOT working or was never created');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Check if trigger function exists: trigger_update_percentiles()');
    console.log('   2. Check if triggers exist on test tables');
    console.log('   3. If missing, need to create the trigger system');
    console.log('   4. Manually insert contributions for Colin\'s complete sessions');
  } else {
    console.log(`   ❌ Colin only has ${completeSessions.length} complete session(s)`);
    console.log(`   ❌ Needs 2 complete sessions to contribute to percentiles`);
    console.log('');
    console.log('💡 This is working as designed - waiting for 2nd complete session');
  }
}

analyzeColinContributions().catch(console.error);
