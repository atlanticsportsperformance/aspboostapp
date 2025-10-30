/**
 * Add or update athlete's contribution to percentile calculations
 *
 * IMPORTANT: This should only be called for an athlete's 2nd+ test at a given play level
 * The SQL function `add_percentile_contribution` checks this automatically
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete UUID
 * @param testType - Test type (CMJ, SJ, HJ, PPU, IMTP)
 * @param playingLevel - Playing level (Youth, High School, College, Pro)
 * @param testId - VALD test ID
 * @param testDate - Test date
 * @param metrics - Object containing the metric values
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface PercentileContributionMetrics {
  peak_takeoff_power_trial_value?: number | null;
  bodymass_relative_takeoff_power_trial_value?: number | null;
  sj_peak_takeoff_power_trial_value?: number | null;
  sj_bodymass_relative_takeoff_power_trial_value?: number | null;
  net_peak_vertical_force_trial_value?: number | null;
  relative_strength_trial_value?: number | null;
  hop_mean_rsi_trial_value?: number | null;
  ppu_peak_takeoff_force_trial_value?: number | null;
}

export async function addPercentileContribution(
  supabase: SupabaseClient,
  athleteId: string,
  testType: 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP',
  playingLevel: 'Youth' | 'High School' | 'College' | 'Pro',
  testId: string,
  testDate: Date,
  metrics: PercentileContributionMetrics
): Promise<{ success: boolean; contributed: boolean; message: string }> {
  try {
    console.log(`[addPercentileContribution] Attempting to add contribution for athlete ${athleteId}, test ${testType}`);

    // Call the PostgreSQL function that handles the logic
    const { data, error } = await supabase.rpc('add_to_percentile_contributions', {
      p_athlete_id: athleteId,
      p_test_type: testType,
      p_playing_level: playingLevel,
      p_test_id: testId,
      p_test_date: testDate.toISOString(),
      p_peak_takeoff_power_trial_value: metrics.peak_takeoff_power_trial_value ?? null,
      p_bodymass_relative_takeoff_power_trial_value: metrics.bodymass_relative_takeoff_power_trial_value ?? null,
      p_sj_peak_takeoff_power_trial_value: metrics.sj_peak_takeoff_power_trial_value ?? null,
      p_sj_bodymass_relative_takeoff_power_trial_value: metrics.sj_bodymass_relative_takeoff_power_trial_value ?? null,
      p_net_peak_vertical_force_trial_value: metrics.net_peak_vertical_force_trial_value ?? null,
      p_relative_strength_trial_value: metrics.relative_strength_trial_value ?? null,
      p_hop_mean_rsi_trial_value: metrics.hop_mean_rsi_trial_value ?? null,
      p_ppu_peak_takeoff_force_trial_value: metrics.ppu_peak_takeoff_force_trial_value ?? null,
    });

    if (error) {
      console.error('[addPercentileContribution] Error:', error);
      return {
        success: false,
        contributed: false,
        message: error.message,
      };
    }

    // The function returns TRUE if contributed, FALSE if skipped (1st test)
    const contributed = data === true;

    if (contributed) {
      console.log(`[addPercentileContribution] ✅ Contribution added for ${testType} test`);
      return {
        success: true,
        contributed: true,
        message: `Contribution added for ${testType} test at ${playingLevel} level`,
      };
    } else {
      console.log(`[addPercentileContribution] ⏭️  Contribution skipped (first test at this level)`);
      return {
        success: true,
        contributed: false,
        message: 'Contribution skipped - this is the athlete\'s first test at this level',
      };
    }
  } catch (err) {
    console.error('[addPercentileContribution] Exception:', err);
    return {
      success: false,
      contributed: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Extract metrics from test data based on test type
 * This helper function pulls the correct metrics for each test type
 */
export function extractMetricsFromTest(
  testType: 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP',
  testData: any
): PercentileContributionMetrics {
  const metrics: PercentileContributionMetrics = {};

  switch (testType) {
    case 'CMJ':
      metrics.peak_takeoff_power_trial_value = testData.peak_takeoff_power_trial_value;
      metrics.bodymass_relative_takeoff_power_trial_value = testData.bodymass_relative_takeoff_power_trial_value;
      break;

    case 'SJ':
      metrics.sj_peak_takeoff_power_trial_value = testData.peak_takeoff_power_trial_value;
      metrics.sj_bodymass_relative_takeoff_power_trial_value = testData.bodymass_relative_takeoff_power_trial_value;
      break;

    case 'HJ':
      metrics.hop_mean_rsi_trial_value = testData.hop_mean_rsi_trial_value;
      break;

    case 'PPU':
      metrics.ppu_peak_takeoff_force_trial_value = testData.peak_takeoff_force_trial_value;
      break;

    case 'IMTP':
      metrics.net_peak_vertical_force_trial_value = testData.net_peak_vertical_force_trial_value;
      metrics.relative_strength_trial_value = testData.relative_strength_trial_value;
      break;
  }

  return metrics;
}
