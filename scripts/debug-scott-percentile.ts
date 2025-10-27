/**
 * Debug why Scott's percentile is showing as 0
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Debugging Scott\'s Percentile Calculation\n');

  const SCOTT_VALUE = 44.13; // Scott's CMJ jump height
  const METRIC = 'jump_height_trial_value';
  const LEVEL = 'Pro';

  console.log(`Scott's value: ${SCOTT_VALUE} cm`);
  console.log(`Metric: ${METRIC}`);
  console.log(`Play level: ${LEVEL}\n`);

  // Check if Pro level exists in percentile_lookup
  const { count: proCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact', head: true })
    .eq('play_level', LEVEL);

  console.log(`Total rows for Pro level: ${proCount}\n`);

  if (!proCount || proCount === 0) {
    console.log('❌ NO DATA FOR PRO LEVEL!');
    console.log('\nChecking what play levels DO have data...\n');

    const { data: levels } = await supabase
      .from('percentile_lookup')
      .select('play_level')
      .eq('metric_column', METRIC);

    const uniqueLevels = [...new Set(levels?.map(l => l.play_level))];
    console.log('Play levels with jump_height_trial_value data:', uniqueLevels);
    return;
  }

  // Check if this metric exists for Pro level
  const { data: metricRows, count: metricCount } = await supabase
    .from('percentile_lookup')
    .select('*', { count: 'exact' })
    .eq('metric_column', METRIC)
    .eq('play_level', LEVEL)
    .order('value', { ascending: true });

  console.log(`Rows for ${METRIC} at ${LEVEL}: ${metricCount}\n`);

  if (!metricCount || metricCount === 0) {
    console.log(`❌ NO DATA FOR ${METRIC} AT ${LEVEL} LEVEL!`);
    return;
  }

  // Show min and max values
  const minRow = metricRows![0];
  const maxRow = metricRows![metricRows!.length - 1];

  console.log(`Min value in dataset: ${minRow.value} cm (${minRow.percentile}th percentile)`);
  console.log(`Max value in dataset: ${maxRow.value} cm (${maxRow.percentile}th percentile)\n`);

  if (SCOTT_VALUE < minRow.value) {
    console.log(`❌ Scott's value (${SCOTT_VALUE}) is BELOW the minimum dataset value (${minRow.value})`);
    console.log(`   This means he's below the 0th percentile threshold\n`);
  } else if (SCOTT_VALUE > maxRow.value) {
    console.log(`✅ Scott's value (${SCOTT_VALUE}) is ABOVE the maximum dataset value (${maxRow.value})`);
    console.log(`   This should show as ${maxRow.percentile}th percentile\n`);
  } else {
    console.log(`✅ Scott's value (${SCOTT_VALUE}) is within the dataset range\n`);
  }

  // Find the exact percentile using the same query as the API
  const { data: percentileData } = await supabase
    .from('percentile_lookup')
    .select('percentile, value')
    .eq('metric_column', METRIC)
    .eq('play_level', LEVEL)
    .lte('value', SCOTT_VALUE)
    .order('value', { ascending: false })
    .limit(1);

  if (percentileData && percentileData.length > 0) {
    console.log(`✅ Percentile found: ${percentileData[0].percentile}th`);
    console.log(`   (Threshold: ${percentileData[0].value} cm)\n`);
  } else {
    console.log(`❌ No percentile found for value ${SCOTT_VALUE}`);
    console.log(`   This means the value is below all thresholds in the database\n`);
  }

  // Show some nearby percentiles
  console.log('Sample percentiles near Scott\'s value:');
  const { data: nearby } = await supabase
    .from('percentile_lookup')
    .select('percentile, value')
    .eq('metric_column', METRIC)
    .eq('play_level', LEVEL)
    .gte('value', SCOTT_VALUE - 5)
    .lte('value', SCOTT_VALUE + 5)
    .order('value', { ascending: true })
    .limit(10);

  if (nearby && nearby.length > 0) {
    nearby.forEach(row => {
      const marker = row.value <= SCOTT_VALUE ? '✓' : ' ';
      console.log(`  ${marker} ${row.percentile}th: ${row.value} cm`);
    });
  } else {
    console.log('  (no data in this range)');
  }
}

main().catch(console.error);
