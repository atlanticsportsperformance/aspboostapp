const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyYouthPercentiles() {
  console.log('=== VERIFYING YOUTH PERCENTILES ===\n');

  // Get unique metrics manually
  const { data: allYouth } = await supabase
    .from('percentile_lookup')
    .select('metric_column, value, total_count')
    .eq('play_level', 'Youth');

  if (!allYouth || allYouth.length === 0) {
    console.log('❌ NO YOUTH PERCENTILES FOUND!\n');
    return;
  }

  console.log(`Total Youth percentile rows: ${allYouth.length}\n`);

  // Group by metric
  const metricGroups = {};
  allYouth.forEach(row => {
    if (!metricGroups[row.metric_column]) {
      metricGroups[row.metric_column] = {
        count: 0,
        total_count: row.total_count,
        min_value: row.value,
        max_value: row.value
      };
    }
    metricGroups[row.metric_column].count++;
    if (row.value < metricGroups[row.metric_column].min_value) {
      metricGroups[row.metric_column].min_value = row.value;
    }
    if (row.value > metricGroups[row.metric_column].max_value) {
      metricGroups[row.metric_column].max_value = row.value;
    }
  });

  console.log('YOUTH PERCENTILES BY METRIC:\n');

  const metricNames = {
    'peak_takeoff_power_trial_value': 'CMJ Peak Power (W)',
    'bodymass_relative_takeoff_power_trial_value': 'CMJ Peak Power/BM (W/kg)',
    'sj_peak_takeoff_power_trial_value': 'SJ Peak Power (W)',
    'sj_bodymass_relative_takeoff_power_trial_value': 'SJ Peak Power/BM (W/kg)',
    'hop_mean_rsi_trial_value': 'HJ Reactive Strength Index',
    'ppu_peak_takeoff_force_trial_value': 'PPU Peak Takeoff Force (N)',
    'net_peak_vertical_force_trial_value': 'IMTP Net Peak Force (N)',
    'relative_strength_trial_value': 'IMTP Relative Strength'
  };

  Object.entries(metricGroups).forEach(([metric, data]) => {
    const displayName = metricNames[metric] || metric;
    console.log(`${displayName}:`);
    console.log(`   Percentile rows: ${data.count}`);
    console.log(`   Athletes contributing: ${data.total_count}`);
    console.log(`   Value range: ${data.min_value?.toFixed(2)} - ${data.max_value?.toFixed(2)}`);
    console.log('');
  });

  console.log('=== SUMMARY ===\n');

  const expectedMetrics = 8; // CMJ(2) + SJ(2) + HJ(1) + PPU(1) + IMTP(2)
  const actualMetrics = Object.keys(metricGroups).length;

  console.log(`Expected metrics: ${expectedMetrics}`);
  console.log(`Actual metrics: ${actualMetrics}`);
  console.log(`Total percentile rows: ${allYouth.length}`);
  console.log('');

  if (actualMetrics === expectedMetrics) {
    console.log('✅ ALL YOUTH PERCENTILES CALCULATED SUCCESSFULLY!');
    console.log('');
    console.log('Youth athletes will now see proper percentile rankings.');
  } else {
    console.log(`❌ MISSING ${expectedMetrics - actualMetrics} metrics!`);
    console.log('');
    console.log('Re-run: scripts/calculate-youth-percentiles.sql');
  }
}

verifyYouthPercentiles().catch(console.error);
