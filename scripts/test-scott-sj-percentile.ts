import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testScottSJ() {
  // Get Scott's SJ test
  const { data: sjTest } = await supabase
    .from('sj_tests')
    .select('*')
    .eq('athlete_id', 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f')
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  console.log('Scott SJ Test:');
  console.log(`  Peak Power: ${sjTest.peak_takeoff_power_trial_value}`);
  console.log(`  Power/BW: ${sjTest.bodymass_relative_takeoff_power_trial_value}`);

  // Query percentile for Peak Power vs Overall
  const { data: peakPowerPercentile } = await supabase
    .from('percentile_lookup')
    .select('*')
    .eq('metric_column', 'sj_peak_takeoff_power_trial_value')
    .eq('play_level', 'Overall')
    .lte('value', sjTest.peak_takeoff_power_trial_value)
    .order('value', { ascending: false })
    .limit(1);

  console.log('\nPeak Power Percentile (Overall):');
  console.log(JSON.stringify(peakPowerPercentile, null, 2));

  // Query percentile for Power/BW vs Overall
  const { data: powerBWPercentile } = await supabase
    .from('percentile_lookup')
    .select('*')
    .eq('metric_column', 'sj_bodymass_relative_takeoff_power_trial_value')
    .eq('play_level', 'Overall')
    .lte('value', sjTest.bodymass_relative_takeoff_power_trial_value)
    .order('value', { ascending: false })
    .limit(1);

  console.log('\nPower/BW Percentile (Overall):');
  console.log(JSON.stringify(powerBWPercentile, null, 2));

  // Calculate composite
  if (peakPowerPercentile && powerBWPercentile) {
    const composite = (peakPowerPercentile[0].percentile + powerBWPercentile[0].percentile) / 2;
    console.log(`\nSJ Composite: ${composite}`);
    console.log(`Expected: ~77 (average of 96 + 57)`);
  }
}

testScottSJ().catch(console.error);
