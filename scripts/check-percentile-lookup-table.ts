/**
 * Check if percentile_lookup table exists and contains athlete contributions
 */

import { createClient } from '@supabase/supabase-js';

async function checkPercentileLookup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking percentile_lookup table...\n');

  // Check if table exists
  const { data: sample, error } = await supabase
    .from('percentile_lookup')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error querying percentile_lookup:', error.message);
    console.log('\n💡 The table may not exist or needs to be created');
    return;
  }

  if (!sample || sample.length === 0) {
    console.log('⚠️  percentile_lookup table is EMPTY');
    console.log('\n💡 This table needs to be populated from:');
    console.log('   1. driveline_percentiles (seed data)');
    console.log('   2. athlete_percentile_contributions (athlete data)\n');
    return;
  }

  console.log(`✅ percentile_lookup table exists with data\n`);
  console.log(`📋 Sample row:\n`);
  console.log(JSON.stringify(sample[0], null, 2));

  // Check total rows
  const { count } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total rows: ${count}\n`);

  // Check metrics available
  const { data: metrics } = await supabase
    .from('percentile_lookup')
    .select('metric_column')
    .order('metric_column');

  if (metrics) {
    const uniqueMetrics = [...new Set(metrics.map(m => m.metric_column))];
    console.log(`📋 Metrics in percentile_lookup:\n`);
    uniqueMetrics.forEach(m => console.log(`   - ${m}`));
  }

  // Check play levels
  const { data: playLevels } = await supabase
    .from('percentile_lookup')
    .select('play_level');

  if (playLevels) {
    const uniqueLevels = [...new Set(playLevels.map(l => l.play_level))];
    console.log(`\n🏆 Play levels:\n`);
    for (const level of uniqueLevels) {
      const { count: levelCount } = await supabase
        .from('percentile_lookup')
        .select('*', { count: 'exact', head: true })
        .eq('play_level', level);

      console.log(`   ${level}: ${levelCount} rows`);
    }
  }

  // Check if Colin Ma's values are in percentile_lookup
  console.log('\n🔍 Checking if athlete contributions are included...\n');

  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (colin) {
    const { data: colinContrib } = await supabase
      .from('athlete_percentile_contributions')
      .select('*')
      .eq('athlete_id', colin.id)
      .eq('test_type', 'CMJ')
      .single();

    if (colinContrib && colinContrib.peak_takeoff_power_trial_value) {
      const colinValue = colinContrib.peak_takeoff_power_trial_value;

      const { data: lookupMatch } = await supabase
        .from('percentile_lookup')
        .select('*')
        .eq('metric_column', 'peak_takeoff_power_trial_value')
        .eq('play_level', colin.play_level)
        .eq('value', colinValue)
        .limit(1);

      if (lookupMatch && lookupMatch.length > 0) {
        console.log(`✅ Colin Ma's CMJ peak power (${colinValue}) FOUND in percentile_lookup`);
        console.log(`   Percentile: ${lookupMatch[0].percentile}`);
      } else {
        console.log(`❌ Colin Ma's CMJ peak power (${colinValue}) NOT in percentile_lookup`);
        console.log(`\n💡 This means athlete_percentile_contributions is NOT being used`);
        console.log(`   to populate the percentile_lookup table.`);
      }
    }
  }
}

checkPercentileLookup().catch(console.error);
