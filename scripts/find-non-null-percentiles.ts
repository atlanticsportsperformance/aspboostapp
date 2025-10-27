import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findNonNull() {
  // Check for rows with NON-NULL values
  const { data: nonNull } = await supabase
    .from('percentile_lookup')
    .select('*')
    .not('value', 'is', null)
    .limit(10);

  console.log(`Rows with NON-NULL values: ${nonNull?.length}`);
  if (nonNull && nonNull.length > 0) {
    console.log('\nSample:');
    console.log(JSON.stringify(nonNull, null, 2));
  }

  // Get total count
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal rows in percentile_lookup: ${count}`);

  // Check what Scott's SJ Peak Power value is
  const { data: scottSJ } = await supabase
    .from('sj_tests')
    .select('peak_takeoff_power_trial_value')
    .eq('athlete_id', 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f')
    .order('recorded_utc', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nScott's SJ Peak Power: ${scottSJ?.peak_takeoff_power_trial_value}`);

  // Try to find percentile for Scott's value
  if (scottSJ) {
    const { data: percentile } = await supabase
      .from('percentile_lookup')
      .select('*')
      .eq('metric_column', 'sj_peak_takeoff_power_trial_value')
      .eq('play_level', 'Overall')
      .lte('value', scottSJ.peak_takeoff_power_trial_value)
      .order('value', { ascending: false })
      .limit(1);

    console.log(`\nPercentile lookup result for SJ Peak Power:`);
    console.log(JSON.stringify(percentile, null, 2));
  }
}

findNonNull().catch(console.error);
