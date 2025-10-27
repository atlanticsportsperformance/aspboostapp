/**
 * Get percentile for a VALD test metric
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface PercentileResult {
  percentile: number | null;
  value: number;
  metricColumn: string;
  playLevel: string;
}

/**
 * Get the percentile for a specific metric value
 *
 * @param supabase - Supabase client
 * @param metricColumn - The database column name (e.g., 'jump_height_trial_value')
 * @param value - The athlete's value for this metric
 * @param playLevel - The athlete's play level (Youth, High School, College, Pro)
 * @returns The percentile (0-100) or null if not found
 */
export async function getTestPercentile(
  supabase: SupabaseClient,
  metricColumn: string,
  value: number,
  playLevel: string
): Promise<number | null> {
  try {
    // Query the percentile_lookup table
    // Find the closest percentile where our value is >= the threshold
    const { data, error } = await supabase
      .from('percentile_lookup')
      .select('percentile')
      .eq('metric_column', metricColumn)
      .eq('play_level', playLevel)
      .lte('value', value) // Find all percentiles where threshold <= our value
      .order('value', { ascending: false }) // Get the highest threshold we beat
      .limit(1);

    if (error) {
      console.error('Error fetching percentile:', error);
      return null;
    }

    if (!data || data.length === 0) {
      // Value is below all thresholds - athlete is below 0th percentile
      // Return 0 to indicate this
      return 0;
    }

    return data[0].percentile;
  } catch (err) {
    console.error('Exception in getTestPercentile:', err);
    return null;
  }
}

/**
 * Get percentiles for multiple metrics from a test
 *
 * @param supabase - Supabase client
 * @param metrics - Array of {metricColumn, value} objects
 * @param playLevel - The athlete's play level
 * @returns Array of percentile results
 */
export async function getTestPercentiles(
  supabase: SupabaseClient,
  metrics: { metricColumn: string; value: number }[],
  playLevel: string
): Promise<PercentileResult[]> {
  const results: PercentileResult[] = [];

  for (const metric of metrics) {
    const percentile = await getTestPercentile(
      supabase,
      metric.metricColumn,
      metric.value,
      playLevel
    );

    results.push({
      percentile,
      value: metric.value,
      metricColumn: metric.metricColumn,
      playLevel,
    });
  }

  return results;
}

/**
 * Get the primary metric percentile for each test type
 *
 * Uses the 6 Driveline composite metrics:
 * - SJ: bodymass_relative_takeoff_power_trial_value (sj_bodymass_relative_takeoff_power_trial_value in Driveline)
 * - SJ: peak_takeoff_power_trial_value (sj_peak_takeoff_power_trial_value in Driveline)
 * - HJ: hop_mean_rsi_trial_value
 * - PPU: ppu_peak_takeoff_force_trial_value (stored as peak_push_force_trial_value in VALD)
 * - IMTP: net_peak_vertical_force_trial_value
 * - IMTP: relative_strength_trial_value
 *
 * Note: CMJ is NOT in the Driveline composite metrics!
 */
export async function getPrimaryMetricPercentile(
  supabase: SupabaseClient,
  testType: 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP',
  testData: any,
  playLevel: string
): Promise<number | null> {
  let metricColumn: string;
  let value: number | null;

  switch (testType) {
    case 'CMJ':
      // CMJ is not in Driveline composite metrics, use bodymass-relative power as fallback
      metricColumn = 'bodymass_relative_takeoff_power_trial_value';
      value = testData.bodymass_relative_takeoff_power_trial_value;
      break;
    case 'SJ':
      // Driveline uses sj_bodymass_relative_takeoff_power_trial_value but we stored it as bodymass_relative_takeoff_power_trial_value
      metricColumn = 'sj_bodymass_relative_takeoff_power_trial_value';
      value = testData.bodymass_relative_takeoff_power_trial_value;
      break;
    case 'HJ':
      metricColumn = 'hop_mean_rsi_trial_value';
      value = testData.rsi_trial_value || testData.hop_mean_rsi_trial_value;
      break;
    case 'PPU':
      // Driveline calls it ppu_peak_takeoff_force but VALD stores as peak_takeoff_force
      metricColumn = 'ppu_peak_takeoff_force_trial_value';
      value = testData.peak_takeoff_force_trial_value;
      break;
    case 'IMTP':
      // Use net peak vertical force (the primary IMTP composite metric)
      // Column name in percentile_lookup: net_peak_vertical_force_trial_value
      metricColumn = 'net_peak_vertical_force_trial_value';
      value = testData.net_peak_vertical_force_trial_value;
      break;
    default:
      return null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return getTestPercentile(supabase, metricColumn, value, playLevel);
}
