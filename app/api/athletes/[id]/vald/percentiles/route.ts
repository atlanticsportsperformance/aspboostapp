/**
 * API endpoint to get percentiles for all VALD tests for an athlete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getPrimaryMetricPercentile } from '@/lib/vald/get-test-percentile';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = await createClient();

    // Use service role client for percentile lookups (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // Get athlete's play level
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('play_level')
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

    // Get latest test for each type
    const testTypes = [
      { type: 'CMJ', table: 'cmj_tests' },
      { type: 'SJ', table: 'sj_tests' },
      { type: 'HJ', table: 'hj_tests' },
      { type: 'PPU', table: 'ppu_tests' },
      { type: 'IMTP', table: 'imtp_tests' },
    ];

    const results = [];

    for (const { type, table } of testTypes) {
      try {
        // Get latest test (use service role for test data access)
        const { data: tests, error: testError } = await serviceSupabase
          .from(table)
          .select('*')
          .eq('athlete_id', athleteId)
          .order('recorded_utc', { ascending: false })
          .limit(2); // Get 2 for trend calculation

        if (testError) {
          console.error(`Error fetching ${type} tests:`, testError);
          results.push({
            test_type: table,
            test_name: type,
            latest_percentile: null,
            test_count: 0,
            trend: 'neutral' as const,
            latest_test_date: null,
          });
          continue;
        }

        if (tests && tests.length > 0) {
          const latestTest = tests[0];
          const previousTest = tests[1] || null;

          // Get percentile for latest test (using service role client)
          let percentile = null;
          let secondaryPercentile = null; // For IMTP's second metric
          let metricPercentiles: Record<string, number | null> = {};

          try {
            percentile = await getPrimaryMetricPercentile(
              serviceSupabase,
              type as any,
              latestTest,
              playLevel
            );

            // Calculate percentiles for additional metrics
            // Using actual column names that exist in percentile_lookup table
            if (type === 'SJ') {
              // SJ Peak Power percentile
              if (latestTest.peak_takeoff_power_trial_value) {
                const { data: ppData } = await serviceSupabase
                  .from('percentile_lookup')
                  .select('percentile')
                  .eq('metric_column', 'sj_peak_takeoff_power_trial_value')
                  .eq('play_level', playLevel)
                  .lte('value', latestTest.peak_takeoff_power_trial_value)
                  .order('value', { ascending: false })
                  .limit(1);
                metricPercentiles.peakPower = ppData && ppData.length > 0 ? ppData[0].percentile : null;
              }
            } else if (type === 'PPU') {
              // PPU Peak Force percentile
              if (latestTest.peak_takeoff_force_trial_value) {
                const { data: pfData } = await serviceSupabase
                  .from('percentile_lookup')
                  .select('percentile')
                  .eq('metric_column', 'ppu_peak_takeoff_force_trial_value')
                  .eq('play_level', playLevel)
                  .lte('value', latestTest.peak_takeoff_force_trial_value)
                  .order('value', { ascending: false })
                  .limit(1);
                // If no data found, athlete is below 0th percentile
                metricPercentiles.force = pfData && pfData.length > 0 ? pfData[0].percentile : 0;
              }
            } else if (type === 'HJ') {
              // HJ RSI percentile
              if (latestTest.hop_mean_rsi_trial_value) {
                const { data: rsiData } = await serviceSupabase
                  .from('percentile_lookup')
                  .select('percentile')
                  .eq('metric_column', 'hop_mean_rsi_trial_value')
                  .eq('play_level', playLevel)
                  .lte('value', latestTest.hop_mean_rsi_trial_value)
                  .order('value', { ascending: false })
                  .limit(1);
                // If no data found, athlete is below 0th percentile
                metricPercentiles.rsi = rsiData && rsiData.length > 0 ? rsiData[0].percentile : 0;
              }
            } else if (type === 'IMTP') {
              // IMTP Relative Strength percentile
              if (latestTest.relative_strength_trial_value) {
                const { data: rsData } = await serviceSupabase
                  .from('percentile_lookup')
                  .select('percentile')
                  .eq('metric_column', 'relative_strength_trial_value')
                  .eq('play_level', playLevel)
                  .lte('value', latestTest.relative_strength_trial_value)
                  .order('value', { ascending: false })
                  .limit(1);
                // If no data found, athlete is below 0th percentile
                secondaryPercentile = rsData && rsData.length > 0 ? rsData[0].percentile : 0;
                metricPercentiles.relativeStrength = secondaryPercentile;
              }
            }
          } catch (err) {
            console.error(`Error getting percentile for ${type}:`, err);
          }

          // Get percentile for previous test (for trend)
          let previousPercentile = null;
          if (previousTest) {
            try {
              previousPercentile = await getPrimaryMetricPercentile(
                serviceSupabase,
                type as any,
                previousTest,
                playLevel
              );
            } catch (err) {
              console.error(`Error getting previous percentile for ${type}:`, err);
            }
          }

          // Determine trend
          let trend: 'up' | 'down' | 'neutral' = 'neutral';
          if (percentile !== null && previousPercentile !== null) {
            if (percentile > previousPercentile) {
              trend = 'up';
            } else if (percentile < previousPercentile) {
              trend = 'down';
            }
          }

          // Extract the actual metric values based on test type
          let metricValues: Record<string, number | null> = {};

          switch (type) {
            case 'CMJ':
              metricValues = {
                power: latestTest.bodymass_relative_takeoff_power_trial_value || null,
                peakPower: latestTest.peak_takeoff_power_trial_value || null,
                peakForce: latestTest.peak_takeoff_force_trial_value || null,
              };
              break;
            case 'SJ':
              metricValues = {
                power: latestTest.bodymass_relative_takeoff_power_trial_value || null,
                peakPower: latestTest.peak_takeoff_power_trial_value || null,
              };
              break;
            case 'HJ':
              metricValues = {
                rsi: latestTest.hop_mean_rsi_trial_value || null,
              };
              break;
            case 'PPU':
              metricValues = {
                force: latestTest.peak_takeoff_force_trial_value || null,
              };
              break;
            case 'IMTP':
              metricValues = {
                netPeakForce: latestTest.net_peak_vertical_force_trial_value || null,
                relativeStrength: latestTest.relative_strength_trial_value || null,
              };
              break;
          }

          results.push({
            test_type: table,
            test_name: type,
            latest_percentile: percentile,
            secondary_percentile: secondaryPercentile, // For IMTP Relative Strength
            metric_percentiles: metricPercentiles, // Percentiles for each individual metric
            test_count: tests.length,
            trend,
            latest_test_date: latestTest.recorded_utc,
            metric_values: metricValues,
          });
        } else {
          // No tests for this type
          results.push({
            test_type: table,
            test_name: type,
            latest_percentile: null,
            test_count: 0,
            trend: 'neutral' as const,
            latest_test_date: null,
          });
        }
      } catch (testTypeError) {
        console.error(`Error processing ${type}:`, testTypeError);
        // Add empty result for this test type
        results.push({
          test_type: table,
          test_name: type,
          latest_percentile: null,
          test_count: 0,
          trend: 'neutral' as const,
          latest_test_date: null,
        });
      }
    }

    // Calculate average percentile from tests that have percentiles
    const percentiles = results
      .map(r => r.latest_percentile)
      .filter((p): p is number => p !== null);

    const averagePercentile = percentiles.length > 0
      ? percentiles.reduce((sum, p) => sum + p, 0) / percentiles.length
      : null;

    return NextResponse.json({
      play_level: playLevel,
      average_percentile: averagePercentile,
      test_scores: results,
    });
  } catch (err) {
    console.error('Error fetching percentiles:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
