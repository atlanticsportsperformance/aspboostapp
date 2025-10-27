import { createServiceRoleClient } from '@/lib/supabase/server';

async function checkScottData() {
  const supabase = createServiceRoleClient();

  console.log('🔍 Checking Scott\'s VALD data...\n');

  // Find Scott
  const { data: scott, error: scottError } = await supabase
    .from('athletes')
    .select('*')
    .ilike('first_name', 'scott')
    .single();

  if (scottError || !scott) {
    console.error('❌ Could not find Scott:', scottError);
    return;
  }

  console.log('✅ Found Scott:', {
    id: scott.id,
    name: `${scott.first_name} ${scott.last_name}`,
    vald_profile_id: scott.vald_profile_id,
    play_level: scott.play_level
  });

  // Check athlete_percentile_history
  const { data: percentileHistory, error: historyError } = await supabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', scott.id);

  console.log('\n📊 Percentile History Rows:', percentileHistory?.length || 0);

  if (percentileHistory && percentileHistory.length > 0) {
    // Group by test type
    const byTestType: Record<string, number> = {};
    percentileHistory.forEach(row => {
      byTestType[row.test_type] = (byTestType[row.test_type] || 0) + 1;
    });

    console.log('Breakdown by test type:');
    Object.entries(byTestType).forEach(([testType, count]) => {
      console.log(`  ${testType}: ${count} rows`);
    });

    console.log('\nSample row:', JSON.stringify(percentileHistory[0], null, 2));
  } else {
    console.log('❌ No percentile history found!');
  }

  // Check test tables
  console.log('\n📋 Raw Test Tables:');

  const testTables = [
    'vald_cmj_tests',
    'vald_sj_tests',
    'vald_hj_tests',
    'vald_imtp_tests',
    'vald_ppu_tests'
  ];

  for (const table of testTables) {
    const { data, error } = await supabase
      .from(table)
      .select('test_id')
      .eq('athlete_id', scott.id);

    console.log(`  ${table}: ${data?.length || 0} tests`);
  }
}

checkScottData().catch(console.error);
