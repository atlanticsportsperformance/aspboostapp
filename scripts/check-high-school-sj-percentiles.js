const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHighSchoolSJ() {
  console.log('=== CHECKING HIGH SCHOOL SJ PERCENTILES ===\n');

  // Check if High School SJ percentiles exist in lookup table
  const { data: hsPercentiles, error } = await supabase
    .from('percentile_lookup')
    .select('metric_column, value, percentile, total_count')
    .eq('play_level', 'High School')
    .in('metric_column', [
      'sj_peak_takeoff_power_trial_value',
      'sj_bodymass_relative_takeoff_power_trial_value'
    ])
    .order('metric_column')
    .order('percentile');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${hsPercentiles?.length || 0} High School SJ percentile rows\n`);

  if (!hsPercentiles || hsPercentiles.length === 0) {
    console.log('❌ NO HIGH SCHOOL SJ PERCENTILES FOUND!\n');
    console.log('This explains why the Oct 21 test shows 0th percentile.');
    console.log('The lookup table has no High School SJ data to compare against.\n');
    return;
  }

  // Group by metric
  const byMetric = {};
  hsPercentiles.forEach(p => {
    if (!byMetric[p.metric_column]) {
      byMetric[p.metric_column] = [];
    }
    byMetric[p.metric_column].push(p);
  });

  console.log('HIGH SCHOOL SJ PERCENTILES:\n');

  Object.entries(byMetric).forEach(([metric, rows]) => {
    const displayName = metric === 'sj_peak_takeoff_power_trial_value'
      ? 'SJ Peak Power (W)'
      : 'SJ Peak Power/BM (W/kg)';

    console.log(`${displayName}:`);
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   Total count (athletes): ${rows[0]?.total_count || 0}`);
    console.log(`   Value range: ${rows[0]?.value} - ${rows[rows.length - 1]?.value}`);

    // Check if 53.392 and 53.612 would be found in this data
    if (metric === 'sj_bodymass_relative_takeoff_power_trial_value') {
      const value1 = 53.392;
      const value2 = 53.612;

      // Find percentile for each value
      const p1Row = rows.filter(r => r.value <= value1).pop();
      const p2Row = rows.filter(r => r.value <= value2).pop();

      console.log(`\n   Test Values:`);
      console.log(`      53.392 W/kg → ${p1Row ? p1Row.percentile + 'th' : 'NOT FOUND'} percentile`);
      console.log(`      53.612 W/kg → ${p2Row ? p2Row.percentile + 'th' : 'NOT FOUND'} percentile`);
    }

    console.log('');
  });

  // Check contributions
  console.log('=== HIGH SCHOOL SJ CONTRIBUTIONS ===\n');

  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('playing_level', 'High School')
    .eq('test_type', 'SJ');

  console.log(`High School SJ contributions: ${contributions?.length || 0}\n`);

  if (contributions && contributions.length > 0) {
    console.log('Sample values:');
    contributions.slice(0, 5).forEach((c, idx) => {
      console.log(`   ${idx + 1}. Peak Power/BM: ${c.sj_bodymass_relative_takeoff_power_trial_value} W/kg`);
    });
  }

  console.log('\n=== DIAGNOSIS ===\n');

  if (hsPercentiles.length === 0) {
    console.log('❌ ISSUE: No High School SJ percentiles in lookup table');
    console.log('');
    console.log('LIKELY CAUSE:');
    console.log('Auto-recalculation trigger may not have fired for High School');
    console.log('OR High School contributions exist but lookup wasn\'t recalculated');
    console.log('');
    console.log('SOLUTION:');
    console.log('Manually recalculate High School percentiles or re-sync a High School athlete');
  } else if (contributions?.length === 0) {
    console.log('⚠️  WARNING: Percentiles exist but no contributions');
    console.log('This is unusual - percentiles should be calculated FROM contributions');
  } else {
    console.log('✅ High School SJ percentiles exist');
    console.log('The 0th percentile issue may be a timing problem or data inconsistency');
  }
}

checkHighSchoolSJ().catch(console.error);
