/**
 * Test percentile lookups with real values
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testLookup(value: number, column: string, level: string, metricName: string) {
  const { data: percentile } = await supabase.rpc('lookup_percentile', {
    p_value: value,
    p_metric_column: column,
    p_play_level: level
  });

  return percentile;
}

async function main() {
  console.log('🧪 Testing Percentile Lookups\n');
  console.log('='.repeat(80) + '\n');

  // Test Case 1: College athlete with good numbers
  console.log('Test Case 1: College Athlete (Above Average)\n');

  const athlete1Tests = [
    { value: 3500, column: 'net_peak_vertical_force_trial_value', name: 'Net Peak Force', unit: 'N' },
    { value: 4.2, column: 'relative_strength_trial_value', name: 'Relative Strength', unit: '' },
    { value: 1300, column: 'ppu_peak_takeoff_force_trial_value', name: 'Peak Force (PPU)', unit: 'N' },
    { value: 5200, column: 'sj_peak_takeoff_power_trial_value', name: 'Peak Power (SJ)', unit: 'W' },
    { value: 60, column: 'sj_bodymass_relative_takeoff_power_trial_value', name: 'Peak Power/BM (SJ)', unit: 'W/kg' },
    { value: 2.8, column: 'hop_mean_rsi_trial_value', name: 'RSI (HJ)', unit: '' },
  ];

  let compositeSum = 0;

  for (const test of athlete1Tests) {
    const percentile = await testLookup(test.value, test.column, 'College', test.name);
    const valueStr = test.unit ? `${test.value} ${test.unit}` : test.value.toString();
    console.log(`  ${test.name.padEnd(30)} ${valueStr.padEnd(15)} →  ${percentile}th percentile`);
    compositeSum += percentile;
  }

  const composite = Math.round(compositeSum / 6);
  console.log(`\n  📊 COMPOSITE SCORE: ${composite}th percentile\n`);

  console.log('-'.repeat(80) + '\n');

  // Test Case 2: High School athlete with average numbers
  console.log('Test Case 2: High School Athlete (Average)\n');

  const athlete2Tests = [
    { value: 2400, column: 'net_peak_vertical_force_trial_value', name: 'Net Peak Force', unit: 'N' },
    { value: 3.1, column: 'relative_strength_trial_value', name: 'Relative Strength', unit: '' },
    { value: 1000, column: 'ppu_peak_takeoff_force_trial_value', name: 'Peak Force (PPU)', unit: 'N' },
    { value: 3600, column: 'sj_peak_takeoff_power_trial_value', name: 'Peak Power (SJ)', unit: 'W' },
    { value: 47, column: 'sj_bodymass_relative_takeoff_power_trial_value', name: 'Peak Power/BM (SJ)', unit: 'W/kg' },
    { value: 2.25, column: 'hop_mean_rsi_trial_value', name: 'RSI (HJ)', unit: '' },
  ];

  compositeSum = 0;

  for (const test of athlete2Tests) {
    const percentile = await testLookup(test.value, test.column, 'High School', test.name);
    const valueStr = test.unit ? `${test.value} ${test.unit}` : test.value.toString();
    console.log(`  ${test.name.padEnd(30)} ${valueStr.padEnd(15)} →  ${percentile}th percentile`);
    compositeSum += percentile;
  }

  const composite2 = Math.round(compositeSum / 6);
  console.log(`\n  📊 COMPOSITE SCORE: ${composite2}th percentile\n`);

  console.log('-'.repeat(80) + '\n');

  // Test Case 3: Pro athlete (elite)
  console.log('Test Case 3: Pro Athlete (Elite)\n');

  const athlete3Tests = [
    { value: 3800, column: 'net_peak_vertical_force_trial_value', name: 'Net Peak Force', unit: 'N' },
    { value: 4.5, column: 'relative_strength_trial_value', name: 'Relative Strength', unit: '' },
    { value: 1500, column: 'ppu_peak_takeoff_force_trial_value', name: 'Peak Force (PPU)', unit: 'N' },
    { value: 6000, column: 'sj_peak_takeoff_power_trial_value', name: 'Peak Power (SJ)', unit: 'W' },
    { value: 65, column: 'sj_bodymass_relative_takeoff_power_trial_value', name: 'Peak Power/BM (SJ)', unit: 'W/kg' },
    { value: 3.0, column: 'hop_mean_rsi_trial_value', name: 'RSI (HJ)', unit: '' },
  ];

  compositeSum = 0;

  for (const test of athlete3Tests) {
    const percentile = await testLookup(test.value, test.column, 'Pro', test.name);
    const valueStr = test.unit ? `${test.value} ${test.unit}` : test.value.toString();
    console.log(`  ${test.name.padEnd(30)} ${valueStr.padEnd(15)} →  ${percentile}th percentile`);
    compositeSum += percentile;
  }

  const composite3 = Math.round(compositeSum / 6);
  console.log(`\n  📊 COMPOSITE SCORE: ${composite3}th percentile\n`);

  console.log('='.repeat(80) + '\n');
  console.log('✅ All lookups completed successfully!\n');
}

main().catch(console.error);
