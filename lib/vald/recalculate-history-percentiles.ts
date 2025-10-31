/**
 * Recalculate percentiles for existing athlete_percentile_history rows
 *
 * This is needed after a sync because:
 * 1. Tests are saved and percentiles are calculated from current lookup table
 * 2. Then triggers fire and update the lookup table with new contributions
 * 3. But the history rows already have old percentiles saved
 *
 * This function re-queries the lookup table and updates history rows with correct percentiles
 */

import { SupabaseClient } from '@supabase/supabase-js';

export async function recalculateHistoryPercentiles(
  supabase: SupabaseClient,
  athleteId: string,
  playLevel: string,
  testIds?: string[]
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    console.log(`\n[recalculateHistoryPercentiles] Recalculating for athlete ${athleteId}`);

    // Get all history rows for this athlete (or specific test IDs if provided)
    let query = supabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('play_level', playLevel)
      .not('test_type', 'eq', 'FORCE_PROFILE') // Don't recalculate Force Profile (it's a composite)
      .not('metric_name', 'is', null); // Only rows with actual metrics

    if (testIds && testIds.length > 0) {
      query = query.in('test_id', testIds);
    }

    const { data: historyRows, error: historyError } = await query;

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return { success: false, updatedCount: 0, error: historyError.message };
    }

    if (!historyRows || historyRows.length === 0) {
      console.log('  No history rows to recalculate');
      return { success: true, updatedCount: 0 };
    }

    console.log(`  Found ${historyRows.length} history rows to recalculate`);

    let updatedCount = 0;

    for (const row of historyRows) {
      // Determine the metric column name for lookup table
      let drivelineMetricColumn = '';

      switch (row.test_type) {
        case 'SJ':
          if (row.metric_name === 'Peak Power / BM (W/kg)') {
            drivelineMetricColumn = 'sj_bodymass_relative_takeoff_power_trial_value';
          } else if (row.metric_name === 'Peak Power (W)') {
            drivelineMetricColumn = 'sj_peak_takeoff_power_trial_value';
          }
          break;
        case 'CMJ':
          if (row.metric_name === 'Peak Power / BM (W/kg)') {
            drivelineMetricColumn = 'bodymass_relative_takeoff_power_trial_value';
          } else if (row.metric_name === 'Peak Power (W)') {
            drivelineMetricColumn = 'peak_takeoff_power_trial_value';
          }
          break;
        case 'HJ':
          if (row.metric_name === 'Reactive Strength Index') {
            drivelineMetricColumn = 'hop_mean_rsi_trial_value';
          }
          break;
        case 'PPU':
          if (row.metric_name === 'Peak Takeoff Force (N)') {
            drivelineMetricColumn = 'ppu_peak_takeoff_force_trial_value';
          }
          break;
        case 'IMTP':
          if (row.metric_name === 'Net Peak Force (N)') {
            drivelineMetricColumn = 'net_peak_vertical_force_trial_value';
          } else if (row.metric_name === 'Relative Strength') {
            drivelineMetricColumn = 'relative_strength_trial_value';
          }
          break;
      }

      if (!drivelineMetricColumn) {
        console.warn(`  ⚠️  Could not map metric: ${row.test_type} - ${row.metric_name}`);
        continue;
      }

      // Get updated percentile vs play level
      const { data: playLevelData } = await supabase
        .from('percentile_lookup')
        .select('percentile')
        .eq('metric_column', drivelineMetricColumn)
        .eq('play_level', playLevel)
        .lte('value', row.value)
        .order('value', { ascending: false })
        .limit(1);

      const percentile_play_level = playLevelData && playLevelData.length > 0
        ? playLevelData[0].percentile
        : 0;

      // Get updated percentile vs Overall
      const { data: overallData } = await supabase
        .from('percentile_lookup')
        .select('percentile')
        .eq('metric_column', drivelineMetricColumn)
        .eq('play_level', 'Overall')
        .lte('value', row.value)
        .order('value', { ascending: false })
        .limit(1);

      const percentile_overall = overallData && overallData.length > 0
        ? overallData[0].percentile
        : 0;

      // Only update if percentiles changed
      if (
        percentile_play_level !== row.percentile_play_level ||
        percentile_overall !== row.percentile_overall
      ) {
        const { error: updateError } = await supabase
          .from('athlete_percentile_history')
          .update({
            percentile_play_level,
            percentile_overall,
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`  ❌ Error updating row ${row.id}:`, updateError);
        } else {
          console.log(
            `  ✅ Updated ${row.test_type} - ${row.metric_name}: ` +
            `${row.percentile_play_level}th → ${percentile_play_level}th (play), ` +
            `${row.percentile_overall}th → ${percentile_overall}th (overall)`
          );
          updatedCount++;
        }
      }
    }

    console.log(`[recalculateHistoryPercentiles] ✅ Updated ${updatedCount} history rows`);

    return {
      success: true,
      updatedCount,
    };
  } catch (err) {
    console.error('[recalculateHistoryPercentiles] Exception:', err);
    return {
      success: false,
      updatedCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
