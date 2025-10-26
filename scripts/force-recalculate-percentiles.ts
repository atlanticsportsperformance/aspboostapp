/**
 * Force recalculate by deleting ALL percentiles first, then inserting one at a time
 * This works around the UNIQUE constraint issue
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
    const { data: seedData } = await supabase
      .from('driveline_seed_data')
      .select(metric.vald_field_name)
      .eq('playing_level', playLevel)
      .not(metric.vald_field_name, 'is', null);

    const { data: contribData } = await supabase
      .from('athlete_percentile_contributions')
      .select(metric.vald_field_name)
      .eq('playing_level', playLevel)
      .not(metric.vald_field_name, 'is', null);

    allValues = [
      ...(seedData || []).map(d => d[metric.vald_field_name]),
      ...(contribData || []).map(d => d[metric.vald_field_name])
    ].sort((a, b) => a - b);
  }

  const totalCount = allValues.length;

  if (totalCount === 0) {
    return 0; // No data for this metric/level
  }

  // Calculate and insert threshold values one at a time (to avoid duplicates)
  let inserted = 0;

  for (let percentile = 0; percentile <= 100; percentile++) {
    // Calculate the rank for this percentile
    const targetRank = Math.max(0, Math.ceil((percentile / 100) * totalCount) - 1);
    const threshold = allValues[targetRank];

    // Check if this exact (metric, level, percentile) already exists
    const { data: existing } = await supabase
      .from('percentile_lookup')
      .select('id')
      .eq('metric_column', metric.vald_field_name)
      .eq('play_level', playLevel)
      .eq('percentile', percentile)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('percentile_lookup')
        .update({
          value: Math.round(threshold * 100) / 100,
          total_count: totalCount
        })
        .eq('id', existing.id);
    } else {
      // Insert new
      const { error } = await supabase
        .from('percentile_lookup')
        .insert({
          metric_column: metric.vald_field_name,
          play_level: playLevel,
          value: Math.round(threshold * 100) / 100,
          percentile: percentile,
          total_count: totalCount
        });

      if (error) {
        console.error(`    ❌ Error at percentile ${percentile}:`, error.message);
        continue;
      }
    }

    inserted++;
  }

  return inserted;
}

async function main() {
  const startTime = Date.now();

  console.log('🔧 Force Recalculating ALL Percentiles\n');

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

  if (afterCount! < beforeCount!) {
    console.log(`📉 Reduction: ${beforeCount! - afterCount!} rows (${Math.round((1 - afterCount!/beforeCount!) * 100)}%)`);
  }

  console.log(`⏱️  Took ${elapsed} seconds\n`);
}

main().catch(console.error);
