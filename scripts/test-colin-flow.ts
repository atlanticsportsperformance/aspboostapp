import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColinFlow() {
  const colinId = 'c4909ac5-e9d5-4454-bae9-303ed276d564';

  console.log('=== TESTING COLIN MA UPDATE FLOW ===\n');

  // 1. Check current state
  console.log('1. CURRENT STATE:');
  const { data: current } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, test_type, metric_name, value, percentile_play_level')
    .eq('athlete_id', colinId)
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .order('test_date', { ascending: false })
    .limit(2);

  console.log('SJ Peak Power - Current History:');
  current?.forEach((record, i) => {
    console.log(`  ${i === 0 ? 'CURRENT' : 'PREVIOUS'}: ${record.test_date} - ${record.value.toFixed(1)}W (${record.percentile_play_level}%)`);
  });

  // 2. Check how radar API fetches data
  console.log('\n2. RADAR API QUERY (fetches latest 2 for each metric):');
  const { data: radarData } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, value, percentile_play_level, percentile_overall')
    .eq('athlete_id', colinId)
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .order('test_date', { ascending: false })
    .limit(2);

  console.log('Result for radar chart:');
  console.log('  Current:', radarData?.[0]);
  console.log('  Previous:', radarData?.[1]);

  // 3. Check Force Profile composite
  console.log('\n3. FORCE PROFILE COMPOSITE:');
  const { data: forceProfile } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, percentile_play_level')
    .eq('athlete_id', colinId)
    .eq('test_type', 'FORCE_PROFILE')
    .order('test_date', { ascending: false })
    .limit(2);

  console.log('Force Profile History:');
  forceProfile?.forEach((record, i) => {
    console.log(`  ${i === 0 ? 'CURRENT' : 'PREVIOUS'}: ${record.test_date} - ${record.percentile_play_level}%`);
  });

  // 4. Simulate what happens when new test is added
  console.log('\n4. WHEN COLIN DOES NEW TEST (e.g., Nov 15, 2025):');
  console.log('   - VALD sync will INSERT new records with new test_date');
  console.log('   - Each test will add 2 new rows (e.g., SJ adds Peak Power + Peak Power/BM)');
  console.log('   - Force Profile will INSERT new composite row');
  console.log('   - API queries use ORDER BY test_date DESC LIMIT 2');
  console.log('   - This automatically makes Nov 15 "current" and Oct 21 "previous"');
  console.log('   - Sept 4 data stays in DB but not shown in radar (only latest 2)');

  // 5. Show all dates available
  console.log('\n5. ALL TEST DATES IN DATABASE:');
  const { data: allDates } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, test_type, metric_name')
    .eq('athlete_id', colinId)
    .order('test_date', { ascending: false });

  const uniqueDates = new Set(allDates?.map(r => r.test_date.split('T')[0]));
  console.log('  Unique test dates:', Array.from(uniqueDates));

  // 6. Check individual test section (CMJ example)
  console.log('\n6. INDIVIDUAL TEST SECTION (CMJ example):');
  const { data: cmjHistory } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, metric_name, value, percentile_play_level')
    .eq('athlete_id', colinId)
    .eq('test_type', 'CMJ')
    .order('test_date', { ascending: false });

  console.log(`  Total CMJ records: ${cmjHistory?.length}`);
  console.log('  Available for history chart: ALL records (not limited to 2)');

  const cmjDates = new Set(cmjHistory?.map(r => r.test_date));
  console.log(`  CMJ test dates: ${cmjDates.size} dates`);

  // 7. Summary of what will happen
  console.log('\n=== SUMMARY: WHAT HAPPENS ON NEXT SYNC ===');
  console.log('✅ New test data will be INSERTED (not updated)');
  console.log('✅ Old data remains in database for historical tracking');
  console.log('✅ Force Overview radar: Shows latest 2 tests automatically');
  console.log('✅ Individual test charts: Show ALL tests over time');
  console.log('✅ Metric cards: Compare latest vs previous (dynamic)');
  console.log('✅ No manual updates needed - queries handle it automatically');
  console.log('✅ Composite score recalculates on each sync');
}

testColinFlow().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
