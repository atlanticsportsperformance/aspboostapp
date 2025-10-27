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

    // Get all percentile history for this athlete
    const { data: history, error: historyError } = await serviceSupabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: true });

    if (historyError) {
      console.error('Error fetching percentile history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch percentile history' },
        { status: 500 }
      );
    }

    // Group by test type
    const groupedByTestType: Record<string, any[]> = {
      CMJ: [],
      SJ: [],
      HJ: [],
      PPU: [],
      IMTP: [],
    };

    // Process each history entry
    // NEW: Each row now has BOTH percentiles in separate columns
    for (const entry of history || []) {
      const testType = entry.test_type;

      if (!groupedByTestType[testType]) {
        groupedByTestType[testType] = [];
      }

      groupedByTestType[testType].push({
        test_id: entry.test_id,
        test_date: entry.test_date,
        play_level: entry.play_level, // Athlete's actual play level
        metrics: entry.metrics, // JSONB with both percentile_play_level and percentile_overall per metric
        composite_score_play_level: entry.composite_score_play_level, // Percentile vs athlete's play level
        composite_score_overall: entry.composite_score_overall, // Percentile vs Overall
        created_at: entry.created_at,
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
