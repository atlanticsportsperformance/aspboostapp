const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualTestTables() {
  console.log('=== CHECKING ACTUAL TEST TABLES ===\n');

  const chris = '90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9';
  const emmitt = 'cb209d13-4509-4b36-94e3-0f49b5312b79';

  // Check Chris's PPU tests
  console.log('CHRIS STRACCO - PPU TESTS:\n');
  const { data: chrisPPU } = await supabase
    .from('ppu_tests')
    .select('test_id, recorded_utc, peak_takeoff_force_trial_value')
    .eq('athlete_id', chris)
    .order('recorded_utc', { ascending: true });

  if (chrisPPU && chrisPPU.length > 0) {
    console.log(`   Found ${chrisPPU.length} PPU tests in ppu_tests table:`);
    chrisPPU.forEach((test, idx) => {
      console.log(`      Test ${idx + 1}: ${test.recorded_utc}`);
      console.log(`         test_id: ${test.test_id}`);
      console.log(`         force: ${test.peak_takeoff_force_trial_value}N`);
    });
  } else {
    console.log('   ❌ No PPU tests found in ppu_tests table!');
  }
  console.log('');

  // Check Chris's PPU in history
  console.log('CHRIS STRACCO - PPU IN HISTORY:\n');
  const { data: chrisPPUHistory } = await supabase
    .from('athlete_percentile_history')
    .select('test_id, test_date, metric_name, value')
    .eq('athlete_id', chris)
    .eq('test_type', 'PPU')
    .order('test_date', { ascending: true });

  if (chrisPPUHistory && chrisPPUHistory.length > 0) {
    console.log(`   Found ${chrisPPUHistory.length} PPU records in history:`);
    const uniqueTests = {};
    chrisPPUHistory.forEach(record => {
      if (!uniqueTests[record.test_id]) {
        uniqueTests[record.test_id] = { date: record.test_date, metrics: [] };
      }
      uniqueTests[record.test_id].metrics.push(`${record.metric_name}: ${record.value}`);
    });

    Object.entries(uniqueTests).forEach(([testId, data], idx) => {
      console.log(`      Test ${idx + 1}: ${data.date}`);
      console.log(`         test_id: ${testId}`);
      data.metrics.forEach(m => console.log(`         ${m}`));
    });
  } else {
    console.log('   ❌ No PPU records found in history!');
  }
  console.log('');

  // Check Emmitt's IMTP tests
  console.log('EMMITT BLISS-CHIN - IMTP TESTS:\n');
  const { data: emmittIMTP } = await supabase
    .from('imtp_tests')
    .select('test_id, recorded_utc, net_peak_vertical_force_trial_value, relative_strength_trial_value')
    .eq('athlete_id', emmitt)
    .order('recorded_utc', { ascending: true });

  if (emmittIMTP && emmittIMTP.length > 0) {
    console.log(`   Found ${emmittIMTP.length} IMTP tests in imtp_tests table:`);
    emmittIMTP.forEach((test, idx) => {
      console.log(`      Test ${idx + 1}: ${test.recorded_utc}`);
      console.log(`         test_id: ${test.test_id}`);
      console.log(`         net_peak_force: ${test.net_peak_vertical_force_trial_value}N`);
      console.log(`         relative_strength: ${test.relative_strength_trial_value}`);
    });
  } else {
    console.log('   ❌ No IMTP tests found in imtp_tests table!');
  }
  console.log('');

  // Check Emmitt's IMTP in history
  console.log('EMMITT BLISS-CHIN - IMTP IN HISTORY:\n');
  const { data: emmittIMTPHistory } = await supabase
    .from('athlete_percentile_history')
    .select('test_id, test_date, metric_name, value')
    .eq('athlete_id', emmitt)
    .eq('test_type', 'IMTP')
    .order('test_date', { ascending: true });

  if (emmittIMTPHistory && emmittIMTPHistory.length > 0) {
    console.log(`   Found ${emmittIMTPHistory.length} IMTP records in history:`);
    const uniqueTests = {};
    emmittIMTPHistory.forEach(record => {
      if (!uniqueTests[record.test_id]) {
        uniqueTests[record.test_id] = { date: record.test_date, metrics: [] };
      }
      uniqueTests[record.test_id].metrics.push(`${record.metric_name}: ${record.value}`);
    });

    Object.entries(uniqueTests).forEach(([testId, data], idx) => {
      console.log(`      Test ${idx + 1}: ${data.date}`);
      console.log(`         test_id: ${testId}`);
      data.metrics.forEach(m => console.log(`         ${m}`));
    });
  } else {
    console.log('   ❌ No IMTP records found in history!');
  }
  console.log('');

  // Check contributions
  console.log('=== CONTRIBUTIONS TABLE ===\n');

  const { data: chrisPPUContrib } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', chris)
    .eq('test_type', 'PPU')
    .single();

  console.log('Chris PPU Contribution:');
  if (chrisPPUContrib) {
    console.log(`   ✅ EXISTS`);
    console.log(`   test_id: ${chrisPPUContrib.test_id}`);
    console.log(`   test_date: ${chrisPPUContrib.test_date}`);
    console.log(`   value: ${chrisPPUContrib.ppu_peak_takeoff_force_trial_value}N`);
  } else {
    console.log('   ❌ MISSING!');
  }
  console.log('');

  const { data: emmittIMTPContrib } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', emmitt)
    .eq('test_type', 'IMTP')
    .single();

  console.log('Emmitt IMTP Contribution:');
  if (emmittIMTPContrib) {
    console.log(`   ✅ EXISTS`);
    console.log(`   test_id: ${emmittIMTPContrib.test_id}`);
    console.log(`   test_date: ${emmittIMTPContrib.test_date}`);
    console.log(`   net_peak_force: ${emmittIMTPContrib.net_peak_vertical_force_trial_value}N`);
    console.log(`   relative_strength: ${emmittIMTPContrib.relative_strength_trial_value}`);
  } else {
    console.log('   ❌ MISSING!');
  }
  console.log('');

  console.log('=== SUMMARY ===\n');
  console.log('Chris should have PPU contribution (has 2 PPU tests)');
  console.log('Emmitt should have IMTP contribution (has 2 IMTP tests)');
  console.log('');
  console.log('If both exist above, the system IS working correctly.');
  console.log('If either is missing, there is a bug.');
}

checkActualTestTables().catch(console.error);
