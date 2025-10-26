/**
 * Test that percentile calculations pull from BOTH tables:
 * - driveline_seed_data (baseline)
 * - athlete_percentile_contributions (growing)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🧪 Testing Percentile Calculation Uses BOTH Tables\n');
  console.log('='.repeat(80) + '\n');

  // Step 1: Check current percentile for a value (only driveline_seed_data)
  console.log('BEFORE adding athlete contribution:\n');

  const testValue = 3000.0;
  const testMetric = 'net_peak_vertical_force_trial_value';
  const testLevel = 'College';

  const { data: beforePercentile } = await supabase.rpc('lookup_percentile', {
    p_value: testValue,
    p_metric_column: testMetric,
    p_play_level: testLevel
  });

  console.log(`  Value: ${testValue} N`);
  console.log(`  Metric: Net Peak Force (IMTP)`);
  console.log(`  Level: ${testLevel}`);
  console.log(`  Percentile: ${beforePercentile}th\n`);

  // Step 2: Check how many data points are in the percentile_lookup for this metric
  const { data: lookupBefore } = await supabase
    .from('percentile_lookup')
    .select('value, percentile, total_count')
    .eq('metric_column', testMetric)
    .eq('play_level', testLevel)
    .eq('value', testValue)
    .single();

  if (lookupBefore) {
    console.log(`  Based on ${lookupBefore.total_count} data points (all from driveline_seed_data)\n`);
  }

  console.log('-'.repeat(80) + '\n');

  // Step 3: Simulate adding an athlete contribution
  console.log('SIMULATING athlete contribution:\n');

  // Get a real athlete
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .limit(1)
    .single();

  if (!athletes) {
    console.log('❌ No athletes in database to test with');
    return;
  }

  console.log(`  Using athlete: ${athletes.first_name} ${athletes.last_name}`);
  console.log(`  Play level: ${athletes.play_level || 'Not set'}\n`);

  // Insert a test contribution (simulating their 2nd test)
  const { error: insertError } = await supabase
    .from('athlete_percentile_contributions')
    .insert({
      athlete_id: athletes.id,
      test_type: 'IMTP',
      playing_level: testLevel,
      test_id: 'test-percentile-check-123',
      test_date: new Date().toISOString(),
      net_peak_vertical_force_trial_value: 3500.0, // Adding a high value
      relative_strength_trial_value: 4.0
    });

  if (insertError) {
    console.log('❌ Could not insert test contribution:', insertError.message);
    return;
  }

  console.log('✅ Added test contribution with Net Peak Force = 3500 N\n');

  // Step 4: Recalculate percentiles for this metric
  console.log('Recalculating percentiles (should now include contribution)...\n');

  const { data: recalcResult, error: recalcError } = await supabase.rpc('recalculate_percentiles_for_metric', {
    p_metric_column: testMetric,
    p_play_level: testLevel
  });

  if (recalcError) {
    console.log('❌ Recalculation error:', recalcError.message);
  } else {
    console.log(`✅ Recalculated ${recalcResult} percentile values\n`);
  }

  // Step 5: Check percentile again (should be based on MORE data now)
  console.log('-'.repeat(80) + '\n');
  console.log('AFTER adding athlete contribution:\n');

  const { data: afterPercentile } = await supabase.rpc('lookup_percentile', {
    p_value: testValue,
    p_metric_column: testMetric,
    p_play_level: testLevel
  });

  console.log(`  Value: ${testValue} N`);
  console.log(`  Percentile: ${afterPercentile}th\n`);

  const { data: lookupAfter } = await supabase
    .from('percentile_lookup')
    .select('value, percentile, total_count')
    .eq('metric_column', testMetric)
    .eq('play_level', testLevel)
    .eq('value', testValue)
    .single();

  if (lookupAfter) {
    console.log(`  Based on ${lookupAfter.total_count} data points`);
    console.log(`  (${lookupBefore?.total_count} from seed + 1 from athlete contribution)\n`);
  }

  // Check if total_count increased
  if (lookupBefore && lookupAfter) {
    const increase = lookupAfter.total_count - lookupBefore.total_count;
    if (increase === 1) {
      console.log('✅ SUCCESS: Percentile calculation now includes athlete contribution!\n');
    } else if (increase === 0) {
      console.log('❌ FAILED: Total count did not increase. Percentiles are NOT pulling from athlete_percentile_contributions!\n');
    } else {
      console.log(`⚠️  Unexpected increase: ${increase} data points\n`);
    }
  }

  // Step 6: Verify the 3500 value is in percentile_lookup
  const { data: highValue } = await supabase
    .from('percentile_lookup')
    .select('value, percentile')
    .eq('metric_column', testMetric)
    .eq('play_level', testLevel)
    .eq('value', 3500)
    .single();

  if (highValue) {
    console.log(`✅ The contributed value (3500 N) is now in percentile_lookup:`);
    console.log(`   Percentile: ${highValue.percentile}th\n`);
  } else {
    console.log('❌ The contributed value (3500 N) was NOT added to percentile_lookup\n');
  }

  // Cleanup
  console.log('-'.repeat(80) + '\n');
  console.log('Cleaning up test data...\n');

  await supabase
    .from('athlete_percentile_contributions')
    .delete()
    .eq('test_id', 'test-percentile-check-123');

  console.log('✅ Cleaned up test contribution\n');

  // Recalculate again to restore original state
  await supabase.rpc('recalculate_percentiles_for_metric', {
    p_metric_column: testMetric,
    p_play_level: testLevel
  });

  console.log('✅ Restored original percentile values\n');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
