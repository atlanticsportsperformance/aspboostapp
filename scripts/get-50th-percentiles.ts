/**
 * Get 50th percentile values for all metrics
 * This shows the MEDIAN value for each metric at each play level
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// All VALD column names we want to calculate 50th percentile for
const METRICS = [
  // CMJ
  { column: 'jump_height_trial_value', display: 'Jump Height (CMJ)', unit: 'cm' },
  { column: 'stiffness_trial_value', display: 'Stiffness (CMJ)', unit: 'N/m' },
  { column: 'peak_takeoff_power_trial_value', display: 'Peak Power (CMJ)', unit: 'W' },
  { column: 'bodymass_relative_takeoff_power_trial_value', display: 'Peak Power/BM (CMJ)', unit: 'W/kg' },
  { column: 'eccentric_braking_rfd_trial_value', display: 'Ecc Braking RFD (CMJ)', unit: 'N/s' },
  { column: 'rsi_modified_trial_value', display: 'RSI Modified (CMJ)', unit: '' },
  { column: 'countermovement_depth_trial_value', display: 'CM Depth (CMJ)', unit: 'cm' },

  // SJ
  { column: 'sj_jump_height_trial_value', display: 'Jump Height (SJ)', unit: 'cm' },
  { column: 'sj_peak_takeoff_power_trial_value', display: 'Peak Power (SJ) ⭐', unit: 'W' },
  { column: 'sj_bodymass_relative_takeoff_power_trial_value', display: 'Peak Power/BM (SJ) ⭐', unit: 'W/kg' },

  // IMTP
  { column: 'peak_vertical_force_trial_value', display: 'Peak Force (IMTP)', unit: 'N' },
  { column: 'net_peak_vertical_force_trial_value', display: 'Net Peak Force (IMTP) ⭐', unit: 'N' },
  { column: 'relative_strength_trial_value', display: 'Relative Strength (IMTP) ⭐', unit: '' },
  { column: 'force_at_100_trial_value', display: 'Force @ 100ms (IMTP)', unit: 'N' },
  { column: 'force_at_150_trial_value', display: 'Force @ 150ms (IMTP)', unit: 'N' },
  { column: 'force_at_200_trial_value', display: 'Force @ 200ms (IMTP)', unit: 'N' },

  // HJ (Hop Test)
  { column: 'hop_mean_stiffness_trial_value', display: 'Mean Stiffness (HJ)', unit: 'N/m' },
  { column: 'hop_mean_jump_height_trial_value', display: 'Mean Jump Height (HJ)', unit: 'cm' },
  { column: 'hop_mean_rsi_trial_value', display: 'Mean RSI (HJ) ⭐', unit: '' },

  // PPU
  { column: 'ppu_peak_takeoff_force_trial_value', display: 'Peak Takeoff Force (PPU) ⭐', unit: 'N' },
  { column: 'ppu_peak_eccentric_force_trial_value', display: 'Peak Eccentric Force (PPU)', unit: 'N' },
];

const PLAY_LEVELS = ['High School', 'College', 'Pro'];

async function getMedianValue(column: string, playLevel: string): Promise<number | null> {
  // Get all non-null values for this column at this play level
  const { data } = await supabase
    .from('driveline_seed_data')
    .select(column)
    .eq('playing_level', playLevel)
    .not(column, 'is', null)
    .order(column, { ascending: true });

  if (!data || data.length === 0) return null;

  const values = data.map(row => row[column]).filter(v => v != null);
  if (values.length === 0) return null;

  // Calculate median (50th percentile)
  const midIndex = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[midIndex - 1] + values[midIndex]) / 2;
  } else {
    return values[midIndex];
  }
}

async function main() {
  console.log('📊 50th PERCENTILE (MEDIAN) VALUES FOR ALL METRICS\n');
  console.log('⭐ = Composite Score Metric\n');
  console.log('='.repeat(100) + '\n');

  for (const level of PLAY_LEVELS) {
    console.log(`\n🏀 ${level.toUpperCase()}\n`);
    console.log('-'.repeat(100));

    for (const metric of METRICS) {
      const median = await getMedianValue(metric.column, level);

      if (median === null) {
        console.log(`${metric.display.padEnd(50)} N/A`);
      } else {
        const valueStr = median.toFixed(2);
        const unitStr = metric.unit ? ` ${metric.unit}` : '';
        console.log(`${metric.display.padEnd(50)} ${valueStr}${unitStr}`);
      }
    }

    console.log('-'.repeat(100));
  }

  console.log('\n\n📊 OVERALL (All Play Levels Combined)\n');
  console.log('-'.repeat(100));

  for (const metric of METRICS) {
    // Get all values regardless of play level
    const { data } = await supabase
      .from('driveline_seed_data')
      .select(metric.column)
      .not(metric.column, 'is', null)
      .order(metric.column, { ascending: true });

    if (!data || data.length === 0) {
      console.log(`${metric.display.padEnd(50)} N/A`);
      continue;
    }

    const values = data.map(row => row[metric.column]).filter(v => v != null);
    if (values.length === 0) {
      console.log(`${metric.display.padEnd(50)} N/A`);
      continue;
    }

    const midIndex = Math.floor(values.length / 2);
    const median = values.length % 2 === 0
      ? (values[midIndex - 1] + values[midIndex]) / 2
      : values[midIndex];

    const valueStr = median.toFixed(2);
    const unitStr = metric.unit ? ` ${metric.unit}` : '';
    console.log(`${metric.display.padEnd(50)} ${valueStr}${unitStr}`);
  }

  console.log('-'.repeat(100));
  console.log('\n✅ Done!\n');
}

main().catch(console.error);
