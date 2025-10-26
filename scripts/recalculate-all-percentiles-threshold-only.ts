/**
 * Recalculate ALL percentiles using threshold-only approach
 * This will reduce from 19k rows to ~4k rows
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAY_LEVELS = ['Youth', 'High School', 'College', 'Pro', 'Overall'];

interface Metric {
  vald_field_name: string;
  display_name: string;
  test_type: string;
}

async function recalculateMetric(metric: Metric, playLevel: string): Promise<number> {
  // Get all values for this metric/level
  const { data: seedData } = await supabase
    .from('driveline_seed_data')
    .select(metric.vald_field_name)
    .eq('playing_level', playLevel === 'Overall' ? 'College' : playLevel) // For Overall, we'll get all levels
    .not(metric.vald_field_name, 'is', null);

  const { data: contribData } = await supabase
    .from('athlete_percentile_contributions')
    .select(metric.vald_field_name)
    .eq('playing_level', playLevel === 'Overall' ? 'College' : playLevel)
    .not(metric.vald_field_name, 'is', null);

  let allValues: number[];

  if (playLevel === 'Overall') {
    // For Overall, get ALL play levels
    const { data: allSeedData } = await supabase
      .from('driveline_seed_data')
      .select(metric.vald_field_name)
      .not(metric.vald_field_name, 'is', null);

    const { data: allContribData } = await supabase
      .from('athlete_percentile_contributions')
      .select(metric.vald_field_name)
      .not(metric.vald_field_name, 'is', null);

    allValues = [
      ...(allSeedData || []).map(d => d[metric.vald_field_name]),
      ...(allContribData || []).map(d => d[metric.vald_field_name])
    ].sort((a, b) => a - b);
  } else {
    allValues = [
      ...(seedData || []).map(d => d[metric.vald_field_name]),
      ...(contribData || []).map(d => d[metric.vald_field_name])
    ].sort((a, b) => a - b);
  }

  const totalCount = allValues.length;

  // Delete old percentiles
  await supabase
    .from('percentile_lookup')
    .delete()
    .eq('metric_column', metric.vald_field_name)
    .eq('play_level', playLevel);

  if (totalCount === 0) {
    // No data yet - insert NULL placeholders for all percentiles
    // This ensures Youth level exists and will work when first athlete tests
    const placeholders = [];
    for (let percentile = 0; percentile <= 100; percentile++) {
      placeholders.push({
        metric_column: metric.vald_field_name,
        play_level: playLevel,
        value: null, // NULL until we have data
        percentile: percentile,
        total_count: 0
      });
    }

    const { error } = await supabase
      .from('percentile_lookup')
      .insert(placeholders);

    if (error) {
      console.error(`      ❌ Error inserting placeholders: ${error.message}`);
      return 0;
    }

    return 101; // Inserted 101 placeholder rows
  }

  // Calculate and insert ONLY threshold values (0-100)
  const thresholdsToInsert = [];

  for (let percentile = 0; percentile <= 100; percentile++) {
    // Calculate the rank for this percentile
    const targetRank = Math.max(0, Math.ceil((percentile / 100) * totalCount) - 1);
    const threshold = allValues[targetRank];

    thresholdsToInsert.push({
      metric_column: metric.vald_field_name,
      play_level: playLevel,
      value: Math.round(threshold * 100) / 100, // Round to 2 decimals
      percentile: percentile,
      total_count: totalCount
    });
  }

  const { error } = await supabase
    .from('percentile_lookup')
    .insert(thresholdsToInsert);

  if (error) {
    console.error(`❌ Error inserting ${metric.display_name} (${playLevel}):`, error.message);
    return 0;
  }

  return thresholdsToInsert.length;
}

async function main() {
  const startTime = Date.now();

  console.log('🔧 Recalculating ALL Percentiles (Threshold-Only Approach)\n');

  // Get total before
  const { count: beforeCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 BEFORE: ${beforeCount} rows\n`);

  // Get all metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('percentile_metric_mappings')
    .select('vald_field_name, display_name, test_type')
    .order('test_type');

  if (metricsError || !metrics) {
    console.error('❌ Error fetching metrics:', metricsError?.message);
    return;
  }

  console.log(`Processing ${metrics.length} metrics × ${PLAY_LEVELS.length} play levels = ${metrics.length * PLAY_LEVELS.length} combinations\n`);

  let totalInserted = 0;

  for (const metric of metrics) {
    console.log(`\n📊 ${metric.test_type} - ${metric.display_name}`);

    for (const level of PLAY_LEVELS) {
      const count = await recalculateMetric(metric, level);

      if (count > 0) {
        totalInserted += count;
        console.log(`  ✅ ${level.padEnd(12)}: ${count} thresholds`);
      } else {
        console.log(`  ⚠️  ${level.padEnd(12)}: No data`);
      }
    }
  }

  // Get total after
  const { count: afterCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n✅ Percentile recalculation complete!\n');
  console.log(`📊 BEFORE: ${beforeCount} rows`);
  console.log(`📊 AFTER:  ${afterCount} rows`);
  console.log(`📉 Reduction: ${beforeCount! - afterCount!} rows (${Math.round((1 - afterCount!/beforeCount!) * 100)}%)`);
  console.log(`⏱️  Took ${elapsed} seconds\n`);
}

main().catch(console.error);
