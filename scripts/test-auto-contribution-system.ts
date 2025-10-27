/**
 * Test the auto-contribution trigger system
 * This script verifies that:
 * 1. Triggers exist on all test tables
 * 2. Function exists and is correct
 * 3. System correctly identifies athletes with 2+ complete sessions
 */

import { createClient } from '@supabase/supabase-js';

async function testAutoContributionSystem() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🧪 Testing Auto-Contribution Trigger System...\n');
  console.log('='.repeat(60) + '\n');

  let allTestsPassed = true;

  // TEST 1: Check if function exists
  console.log('TEST 1: Check if trigger function exists');
  console.log('-'.repeat(60));

  const { data: functions } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'check_and_add_percentile_contribution';
    `
  }) as any;

  if (functions && functions.length > 0) {
    console.log('✅ PASS: Function check_and_add_percentile_contribution() exists\n');
  } else {
    console.log('❌ FAIL: Function check_and_add_percentile_contribution() NOT found\n');
    allTestsPassed = false;
  }

  // TEST 2: Check if triggers exist
  console.log('TEST 2: Check if triggers exist on all test tables');
  console.log('-'.repeat(60));

  const { data: triggers } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT event_object_table, trigger_name
      FROM information_schema.triggers
      WHERE event_object_table IN ('cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests')
        AND trigger_schema = 'public'
        AND trigger_name LIKE 'auto_add_contribution%'
      ORDER BY event_object_table;
    `
  }) as any;

  const expectedTables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];
  const foundTables = new Set(triggers?.map((t: any) => t.event_object_table) || []);

  expectedTables.forEach(table => {
    if (foundTables.has(table)) {
      console.log(`✅ ${table}: Trigger exists`);
    } else {
      console.log(`❌ ${table}: Trigger MISSING`);
      allTestsPassed = false;
    }
  });

  if (triggers && triggers.length === 5) {
    console.log(`\n✅ PASS: All 5 triggers exist\n`);
  } else {
    console.log(`\n❌ FAIL: Expected 5 triggers, found ${triggers?.length || 0}\n`);
    allTestsPassed = false;
  }

  // TEST 3: Check Colin Ma's contributions
  console.log('TEST 3: Verify Colin Ma has all 5 contributions');
  console.log('-'.repeat(60));

  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (colin) {
    const { data: contributions } = await supabase
      .from('athlete_percentile_contributions')
      .select('test_type')
      .eq('athlete_id', colin.id)
      .order('test_type', { ascending: true });

    const contributionTypes = new Set(contributions?.map(c => c.test_type) || []);

    ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'].forEach(type => {
      if (contributionTypes.has(type)) {
        console.log(`✅ ${type}: Contribution exists`);
      } else {
        console.log(`❌ ${type}: Contribution MISSING`);
        allTestsPassed = false;
      }
    });

    if (contributions && contributions.length === 5) {
      console.log(`\n✅ PASS: Colin Ma has all 5 contributions\n`);
    } else {
      console.log(`\n❌ FAIL: Colin Ma has ${contributions?.length || 0} contributions (expected 5)\n`);
      allTestsPassed = false;
    }
  } else {
    console.log('⚠️  SKIP: Colin Ma not found in database\n');
  }

  // TEST 4: Check for athletes with 2+ complete sessions
  console.log('TEST 4: Identify all athletes eligible for contributions');
  console.log('-'.repeat(60));

  // Get all athletes with 2+ complete sessions
  const { data: allAthletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .not('play_level', 'is', null);

  if (allAthletes) {
    console.log(`Found ${allAthletes.length} athlete(s) with play level set\n`);

    for (const athlete of allAthletes) {
      // Count complete sessions
      const { data: cmjTests } = await supabase
        .from('cmj_tests')
        .select('recorded_utc')
        .eq('athlete_id', athlete.id);

      const { data: sjTests } = await supabase
        .from('sj_tests')
        .select('recorded_utc')
        .eq('athlete_id', athlete.id);

      const { data: hjTests } = await supabase
        .from('hj_tests')
        .select('recorded_utc')
        .eq('athlete_id', athlete.id);

      const { data: ppuTests } = await supabase
        .from('ppu_tests')
        .select('recorded_utc')
        .eq('athlete_id', athlete.id);

      const { data: imtpTests } = await supabase
        .from('imtp_tests')
        .select('recorded_utc')
        .eq('athlete_id', athlete.id);

      const allTests: { date: string; type: string }[] = [];
      cmjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'CMJ' }));
      sjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'SJ' }));
      hjTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'HJ' }));
      ppuTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'PPU' }));
      imtpTests?.forEach(t => allTests.push({ date: new Date(t.recorded_utc).toISOString().split('T')[0], type: 'IMTP' }));

      const testsByDate = allTests.reduce((acc, test) => {
        if (!acc[test.date]) {
          acc[test.date] = new Set();
        }
        acc[test.date].add(test.type);
        return acc;
      }, {} as Record<string, Set<string>>);

      const completeSessions = Object.values(testsByDate).filter(types => types.size === 5).length;

      if (completeSessions >= 2) {
        const { data: contributions } = await supabase
          .from('athlete_percentile_contributions')
          .select('test_type')
          .eq('athlete_id', athlete.id);

        const hasAllContributions = contributions && contributions.length === 5;

        if (hasAllContributions) {
          console.log(`✅ ${athlete.first_name} ${athlete.last_name}: ${completeSessions} sessions, 5 contributions`);
        } else {
          console.log(`⚠️  ${athlete.first_name} ${athlete.last_name}: ${completeSessions} sessions, ${contributions?.length || 0} contributions (SHOULD BE 5)`);
          allTestsPassed = false;
        }
      }
    }
  }

  console.log('');

  // FINAL RESULT
  console.log('='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED! Auto-contribution system is working correctly!');
  } else {
    console.log('❌ SOME TESTS FAILED - See details above');
  }
  console.log('='.repeat(60));
}

testAutoContributionSystem().catch(console.error);
