/**
 * Save percentile history for a VALD test
 *
 * NEW APPROACH: Store ONE ROW PER METRIC with percentile_play_level and percentile_overall columns
 * - Each metric gets its own row
 * - Columns: test_type, metric_name, value, percentile_play_level, percentile_overall
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate and save percentile history for all metrics in a test
 *
 * Creates MULTIPLE ROWS - one per metric - each with both percentile rankings
 *
 * @param supabase - Supabase client (should be service role)
 * @param athleteId - Athlete UUID
 * @param testType - Test type (CMJ, SJ, HJ, PPU, IMTP)
 * @param testId - VALD test ID
 * @param testData - Full test data object
 * @param testDate - Test date
 * @param playLevel - Athlete's play level (Pro, High School, etc.)
 */
export async function saveTestPercentileHistory(
  supabase: SupabaseClient,
  athleteId: string,
  testType: 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP',
  testId: string,
  testData: any,
  testDate: Date,
  playLevel: string
): Promise<boolean> {
  try {
    console.log(`[saveTestPercentileHistory] Processing test ${testId} for athlete ${athleteId}`);
    console.log(`[saveTestPercentileHistory] Play level: ${playLevel}, Test type: ${testType}`);

    // Define which metrics to track for each test type
    // ONLY track metrics that exist in percentile_lookup table (the 6 composite metrics)
    const metricsToTrack: Record<string, { column: string; displayName: string }[]> = {
      CMJ: [
        { column: 'bodymass_relative_takeoff_power_trial_value', displayName: 'Peak Power / BM (W/kg)' },
        { column: 'peak_takeoff_power_trial_value', displayName: 'Peak Power (W)' },
      ],
      SJ: [
        { column: 'peak_takeoff_power_trial_value', displayName: 'Peak Power (W)' },
        { column: 'bodymass_relative_takeoff_power_trial_value', displayName: 'Peak Power / BM (W/kg)' },
      ],
      HJ: [
        { column: 'hop_mean_rsi_trial_value', displayName: 'Reactive Strength Index' },
      ],
      PPU: [
        { column: 'peak_takeoff_force_trial_value', displayName: 'Peak Takeoff Force (N)' },
      ],
      IMTP: [
        { column: 'net_peak_vertical_force_trial_value', displayName: 'Net Peak Force (N)' },
        { column: 'relative_strength_trial_value', displayName: 'Relative Strength' },
      ],
    };

    const metricsConfig = metricsToTrack[testType] || [];

    // Process each metric and save as individual row
    for (const metricConfig of metricsConfig) {
      const value = testData[metricConfig.column];

      if (value !== null && value !== undefined) {
        // Determine the Driveline metric column name (may differ from VALD column name)
        let drivelineMetricColumn = metricConfig.column;

        // Apply naming conversions to match percentile_lookup table exactly
        if (testType === 'SJ' && metricConfig.column === 'bodymass_relative_takeoff_power_trial_value') {
          drivelineMetricColumn = 'sj_bodymass_relative_takeoff_power_trial_value';
        } else if (testType === 'SJ' && metricConfig.column === 'peak_takeoff_power_trial_value') {
          drivelineMetricColumn = 'sj_peak_takeoff_power_trial_value';
        } else if (testType === 'PPU' && metricConfig.column === 'peak_takeoff_force_trial_value') {
          drivelineMetricColumn = 'ppu_peak_takeoff_force_trial_value';
        }

        // Get percentile vs athlete's play level
        const { data: playLevelData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', drivelineMetricColumn)
          .eq('play_level', playLevel)
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile_play_level = playLevelData && playLevelData.length > 0
          ? playLevelData[0].percentile
          : 0;

        // Get percentile vs Overall
        const { data: overallData } = await supabase
          .from('percentile_lookup')
          .select('percentile')
          .eq('metric_column', drivelineMetricColumn)
          .eq('play_level', 'Overall')
          .lte('value', value)
          .order('value', { ascending: false })
          .limit(1);

        const percentile_overall = overallData && overallData.length > 0
          ? overallData[0].percentile
          : 0;

        console.log(`[saveTestPercentileHistory]   ${metricConfig.displayName}: ${value} → ${playLevel}=${percentile_play_level}th, Overall=${percentile_overall}th`);

        // Check if row exists for this EXACT metric + play_level combination
        const { data: existing } = await supabase
          .from('athlete_percentile_history')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('test_id', testId)
          .eq('test_type', testType)
          .eq('metric_name', metricConfig.displayName)
          .eq('play_level', playLevel) // IMPORTANT: Only update if same play_level
          .single();

        let error;
        if (existing) {
          // Update existing row (same test, same play level)
          const result = await supabase
            .from('athlete_percentile_history')
            .update({
              test_date: testDate.toISOString(),
              play_level: playLevel,
              metric_name: metricConfig.displayName,
              value: value,
              percentile_play_level: percentile_play_level,
              percentile_overall: percentile_overall,
            })
            .eq('id', existing.id);
          error = result.error;
        } else {
          // Insert new row (either new test OR same test with different play level)
          const result = await supabase
            .from('athlete_percentile_history')
            .insert({
              athlete_id: athleteId,
              test_type: testType,
              test_date: testDate.toISOString(),
              test_id: testId,
              play_level: playLevel,
              metric_name: metricConfig.displayName,
              value: value,
              percentile_play_level: percentile_play_level,
              percentile_overall: percentile_overall,
            });
          error = result.error;
        }

        if (error) {
          console.error(`[saveTestPercentileHistory] Error saving metric ${metricConfig.displayName}:`, error);
          return false;
        }
      }
    }

    console.log(`[saveTestPercentileHistory] ✅ Successfully saved all metrics for ${testType} test`);
    return true;
  } catch (err) {
    console.error('[saveTestPercentileHistory] Exception:', err);
    return false;
  }
}
