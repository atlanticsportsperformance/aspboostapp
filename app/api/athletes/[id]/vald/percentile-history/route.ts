/**
 * API endpoint to get percentile history over time for charting
 *
 * Returns all historical percentile data for an athlete from athlete_percentile_history table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const { searchParams } = new URL(request.url);
    const testTypeFilter = searchParams.get('test_type'); // Optional filter by test type

    const supabase = await createClient();

    // Use service role client for percentile history access (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // Get athlete's play level
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('play_level, first_name, last_name')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    if (!athlete.play_level) {
      return NextResponse.json(
        { error: 'Athlete has no play level set' },
        { status: 400 }
      );
    }

    const playLevel = athlete.play_level;

    // Build query
    let query = serviceSupabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId);

    // Filter by test type if provided
    if (testTypeFilter) {
      query = query.eq('test_type', testTypeFilter);
    }

    query = query.order('test_date', { ascending: true });

    // Get all percentile history for this athlete
    const { data: history, error: historyError } = await query;

    if (historyError) {
      console.error('Error fetching percentile history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch percentile history' },
        { status: 500 }
      );
    }

    // If test_type filter is provided, flatten metrics for individual test view
    if (testTypeFilter && history) {
      const flattenedMetrics: any[] = [];

      for (const entry of history) {
        // entry.metric_name, entry.value, entry.percentile_play_level, entry.percentile_overall
        flattenedMetrics.push({
          metric_name: entry.metric_name,
          display_name: entry.metric_name, // Can enhance this later with proper display names
          test_date: entry.test_date,
          value: entry.value,
          percentile_play_level: entry.percentile_play_level,
          percentile_overall: entry.percentile_overall,
          test_id: entry.test_id,
        });
      }

      // Calculate 75th percentile VALUE and standard deviation for each metric
      const eliteThresholds: Record<string, number> = {};
      const eliteStdDev: Record<string, number> = {};
      const metricGroups: Record<string, number[]> = {};

      // Group all values by metric
      for (const entry of flattenedMetrics) {
        if (!metricGroups[entry.metric_name]) {
          metricGroups[entry.metric_name] = [];
        }
        metricGroups[entry.metric_name].push(entry.value);
      }

      // Calculate 75th percentile and standard deviation for each metric (filtered by play level)
      for (const [metricName, values] of Object.entries(metricGroups)) {
        // Get all athlete_ids with this metric
        const { data: allRecords } = await serviceSupabase
          .from('athlete_percentile_history')
          .select('value, athlete_id')
          .eq('test_type', testTypeFilter)
          .eq('metric_name', metricName)
          .not('value', 'is', null);

        if (allRecords && allRecords.length > 0) {
          // Get play levels for all athletes
          const athleteIds = Array.from(new Set(allRecords.map((r: any) => r.athlete_id)));
          const { data: athletes } = await serviceSupabase
            .from('athletes')
            .select('id, play_level')
            .in('id', athleteIds);

          const athletePlayLevelMap = new Map(athletes?.map((a: any) => [a.id, a.play_level]));

          // Filter to same play level as current athlete
          const playLevelValues = allRecords
            .filter((r: any) => athletePlayLevelMap.get(r.athlete_id) === playLevel)
            .map((r: any) => r.value);

          if (playLevelValues.length > 0) {
            const sortedValues = playLevelValues.sort((a, b) => a - b);
            const p75Index = Math.floor(sortedValues.length * 0.75);
            eliteThresholds[metricName] = sortedValues[p75Index];

            // Calculate standard deviation of play level values
            const mean = sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;
            const variance = sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sortedValues.length;
            eliteStdDev[metricName] = Math.sqrt(variance);
          }
        }
      }

      return NextResponse.json({
        athlete: {
          id: athleteId,
          name: `${athlete.first_name} ${athlete.last_name}`,
          play_level: playLevel,
        },
        test_type: testTypeFilter,
        metrics: flattenedMetrics,
        elite_thresholds: eliteThresholds,
        elite_std_dev: eliteStdDev,
        total_tests: flattenedMetrics.length,
      });
    }

    // Otherwise, group by test type for overview
    const groupedByTestType: Record<string, any[]> = {
      CMJ: [],
      SJ: [],
      HJ: [],
      PPU: [],
      IMTP: [],
    };

    // Process each history entry
    for (const entry of history || []) {
      const testType = entry.test_type;

      if (!groupedByTestType[testType]) {
        groupedByTestType[testType] = [];
      }

      groupedByTestType[testType].push({
        test_id: entry.test_id,
        test_date: entry.test_date,
        metric_name: entry.metric_name,
        value: entry.value,
        percentile_play_level: entry.percentile_play_level,
        percentile_overall: entry.percentile_overall,
      });
    }

    return NextResponse.json({
      athlete: {
        id: athleteId,
        name: `${athlete.first_name} ${athlete.last_name}`,
        play_level: playLevel,
      },
      history_by_test_type: groupedByTestType,
      total_tests: history?.length || 0,
    });
  } catch (err) {
    console.error('Error in percentile history endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
