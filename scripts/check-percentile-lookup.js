const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPercentileLookup() {
  console.log('=== CHECKING PERCENTILE_LOOKUP TABLE ===\n');

  // 1. Check what play levels exist
  const { data: playLevels, error: plError } = await supabase
    .from('percentile_lookup')
    .select('play_level')
    .order('play_level');

  if (plError) {
    console.error('Error fetching play levels:', plError);
    return;
  }

  const uniquePlayLevels = [...new Set(playLevels?.map(p => p.play_level) || [])];
  console.log('1. PLAY LEVELS IN LOOKUP TABLE:');
  uniquePlayLevels.forEach(pl => console.log(`   - ${pl}`));
  console.log('');

  // 2. Check counts by play level
  console.log('2. RECORD COUNTS BY PLAY LEVEL:');
  for (const playLevel of uniquePlayLevels) {
    const { count, error } = await supabase
      .from('percentile_lookup')
      .select('*', { count: 'exact', head: true })
      .eq('play_level', playLevel);

    console.log(`   ${playLevel}: ${count} records`);
  }
  console.log('');

  // 3. Check Youth metrics specifically
  console.log('3. YOUTH METRICS IN LOOKUP TABLE:');
  const { data: youthMetrics, error: ymError } = await supabase
    .from('percentile_lookup')
    .select('metric_column, COUNT(*) as count')
    .eq('play_level', 'Youth');

  if (!youthMetrics || youthMetrics.length === 0) {
    console.log('   ❌ NO YOUTH METRICS FOUND!');
  } else {
    const { data: youthMetricList, error: ymlError } = await supabase
      .from('percentile_lookup')
      .select('metric_column')
      .eq('play_level', 'Youth');

    const uniqueMetrics = [...new Set(youthMetricList?.map(m => m.metric_column) || [])];
    uniqueMetrics.forEach(metric => {
      const count = youthMetricList.filter(m => m.metric_column === metric).length;
      console.log(`   ${metric}: ${count} percentile points`);
    });
  }
  console.log('');

  // 4. Sample Youth data
  console.log('4. SAMPLE YOUTH DATA (first 5 rows):');
  const { data: youthSample, error: ysError } = await supabase
    .from('percentile_lookup')
    .select('metric_column, value, percentile, total_count')
    .eq('play_level', 'Youth')
    .limit(5);

  if (!youthSample || youthSample.length === 0) {
    console.log('   ❌ NO YOUTH DATA FOUND!');
  } else {
    youthSample.forEach(row => {
      console.log(`   ${row.metric_column}: value=${row.value}, percentile=${row.percentile}, count=${row.total_count}`);
    });
  }
  console.log('');

  // 5. Check for null values
  console.log('5. CHECKING FOR NULL VALUES:');
  const { data: nullValues, error: nvError } = await supabase
    .from('percentile_lookup')
    .select('play_level, metric_column, value, percentile, total_count')
    .eq('play_level', 'Youth')
    .is('value', null)
    .limit(10);

  if (nullValues && nullValues.length > 0) {
    console.log(`   ⚠️ Found ${nullValues.length} rows with NULL values:`);
    nullValues.forEach(row => {
      console.log(`      ${row.metric_column}: value=${row.value}, percentile=${row.percentile}, count=${row.total_count}`);
    });
  } else {
    console.log('   ✅ No NULL values found');
  }
  console.log('');

  // 6. Check total_count = 0
  console.log('6. CHECKING FOR ZERO COUNTS:');
  const { data: zeroCounts, error: zcError } = await supabase
    .from('percentile_lookup')
    .select('play_level, metric_column, value, percentile, total_count')
    .eq('play_level', 'Youth')
    .eq('total_count', 0)
    .limit(10);

  if (zeroCounts && zeroCounts.length > 0) {
    console.log(`   ⚠️ Found ${zeroCounts.length} rows with total_count=0:`);
    zeroCounts.forEach(row => {
      console.log(`      ${row.metric_column}: value=${row.value}, percentile=${row.percentile}, count=${row.total_count}`);
    });
  } else {
    console.log('   ✅ No zero counts found');
  }
  console.log('');

  console.log('=== DIAGNOSTIC SUMMARY ===\n');

  if (uniquePlayLevels.includes('Youth')) {
    const { count: youthCount } = await supabase
      .from('percentile_lookup')
      .select('*', { count: 'exact', head: true })
      .eq('play_level', 'Youth');

    if (youthCount === 0) {
      console.log('❌ ISSUE: Youth play level exists but has NO DATA');
      console.log('');
      console.log('LIKELY CAUSES:');
      console.log('1. percentile_lookup table has never been calculated/populated');
      console.log('2. Youth data needs to be regenerated from athlete_percentile_contributions');
      console.log('');
      console.log('SOLUTION:');
      console.log('You need a script/function to CALCULATE percentiles from athlete_percentile_contributions');
      console.log('and POPULATE the percentile_lookup table.');
    } else {
      const { data: validData, error: vdError } = await supabase
        .from('percentile_lookup')
        .select('*', { count: 'exact', head: true })
        .eq('play_level', 'Youth')
        .not('value', 'is', null)
        .gt('total_count', 0);

      if (validData === 0 || !validData) {
        console.log('❌ ISSUE: Youth data exists but ALL values are NULL or total_count=0');
        console.log('');
        console.log('LIKELY CAUSES:');
        console.log('1. Calculation script failed or has bugs');
        console.log('2. Data was inserted incorrectly');
        console.log('');
        console.log('SOLUTION:');
        console.log('Need to regenerate percentile_lookup from athlete_percentile_contributions');
      } else {
        console.log('✅ Youth data exists and appears valid');
      }
    }
  } else {
    console.log('❌ ISSUE: Youth play level does NOT exist in percentile_lookup table');
    console.log('');
    console.log('LIKELY CAUSES:');
    console.log('1. percentile_lookup was populated with Driveline data only');
    console.log('2. Youth percentiles have never been calculated');
    console.log('');
    console.log('SOLUTION:');
    console.log('You need a script to calculate Youth percentiles from athlete_percentile_contributions');
  }

  console.log('');
  console.log('=== END DIAGNOSTIC ===');
}

checkPercentileLookup().catch(console.error);
