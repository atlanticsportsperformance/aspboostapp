/**
 * Apply the threshold-only percentile migration directly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔧 Applying Threshold-Only Percentile Migration\n');

  // First, let's test one metric to see the difference
  console.log('📊 BEFORE Migration:\n');

  const { count: beforeCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true })
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College');

  console.log(`  Net Peak Force (College): ${beforeCount} rows\n`);

  // Delete all current percentiles for this one metric/level
  console.log('🗑️  Clearing old percentiles for Net Peak Force (College)...');

  const { error: deleteError } = await supabase
    .from('percentile_lookup')
    .delete()
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College');

  if (deleteError) {
    console.error('❌ Error deleting:', deleteError.message);
    return;
  }
  console.log('✅ Cleared\n');

  // Get all values for this metric/level
  console.log('📥 Fetching all athlete values...');

  const { data: seedData } = await supabase
    .from('driveline_seed_data')
    .select('net_peak_vertical_force_trial_value')
    .eq('playing_level', 'College')
    .not('net_peak_vertical_force_trial_value', 'is', null);

  const { data: contribData } = await supabase
    .from('athlete_percentile_contributions')
    .select('net_peak_vertical_force_trial_value')
    .eq('playing_level', 'College')
    .not('net_peak_vertical_force_trial_value', 'is', null);

  const allValues = [
    ...(seedData || []).map(d => d.net_peak_vertical_force_trial_value),
    ...(contribData || []).map(d => d.net_peak_vertical_force_trial_value)
  ].sort((a, b) => a - b);

  const totalCount = allValues.length;
  console.log(`✅ Found ${totalCount} values\n`);

  // Calculate and insert ONLY threshold values (0-100)
  console.log('💾 Inserting percentile thresholds (0-100)...\n');

  const thresholdsToInsert = [];

  for (let percentile = 0; percentile <= 100; percentile++) {
    // Calculate the rank for this percentile
    const targetRank = Math.max(0, Math.ceil((percentile / 100) * totalCount) - 1);
    const threshold = allValues[targetRank];

    thresholdsToInsert.push({
      metric_column: 'net_peak_vertical_force_trial_value',
      play_level: 'College',
      value: Math.round(threshold * 100) / 100, // Round to 2 decimals
      percentile: percentile,
      total_count: totalCount
    });

    if (percentile % 10 === 0) {
      console.log(`  ${percentile.toString().padStart(3)}th percentile: ${threshold.toFixed(2)} N`);
    }
  }

  const { error: insertError } = await supabase
    .from('percentile_lookup')
    .insert(thresholdsToInsert);

  if (insertError) {
    console.error('❌ Error inserting:', insertError.message);
    return;
  }

  console.log(`\n✅ Inserted ${thresholdsToInsert.length} threshold rows\n`);

  // Verify
  const { count: afterCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true })
    .eq('metric_column', 'net_peak_vertical_force_trial_value')
    .eq('play_level', 'College');

  console.log('📊 AFTER Migration:\n');
  console.log(`  Net Peak Force (College): ${afterCount} rows\n`);
  console.log(`  ${beforeCount} rows → ${afterCount} rows (${Math.round((1 - afterCount!/beforeCount!) * 100)}% reduction)\n`);

  console.log('✅ Migration successful for test metric!\n');
  console.log('To apply to ALL metrics, run: npx tsx scripts/recalculate-all-percentiles-threshold-only.ts\n');
}

main().catch(console.error);
