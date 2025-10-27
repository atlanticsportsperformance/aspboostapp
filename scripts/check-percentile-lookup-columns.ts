import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  // Get unique metric_column values
  const { data } = await supabase
    .from('percentile_lookup')
    .select('metric_column')
    .order('metric_column');

  const uniqueColumns = [...new Set(data?.map(r => r.metric_column))];

  console.log(`Total unique metric_column values: ${uniqueColumns.length}\n`);

  console.log('All metric columns in percentile_lookup:');
  uniqueColumns.forEach(col => console.log(`  - ${col}`));

  // Check specific columns we're looking for
  console.log('\n=== Checking our mappings ===');
  const ourMappings = [
    'sj_peak_takeoff_power_trial_value',
    'sj_bodymass_relative_takeoff_power_trial_value',
    'hop_mean_rsi_trial_value',
    'ppu_peak_takeoff_force_trial_value',
    'net_peak_vertical_force_imtp',
    'relative_strength',
  ];

  ourMappings.forEach(col => {
    const exists = uniqueColumns.includes(col);
    console.log(`  ${col}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  });
}

checkColumns().catch(console.error);
