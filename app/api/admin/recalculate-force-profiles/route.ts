/**
 * Admin endpoint to recalculate all FORCE_PROFILE composite scores
 *
 * This deletes all existing FORCE_PROFILE rows and recreates them
 * based on the current logic (requires all 5 tests)
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { updateCompositeScoreOverall } from '@/lib/vald/update-composite-score';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // 1. Delete all existing FORCE_PROFILE rows
    const { error: deleteError } = await supabase
      .from('athlete_percentile_history')
      .delete()
      .eq('test_type', 'FORCE_PROFILE');

    if (deleteError) {
      console.error('Error deleting FORCE_PROFILE rows:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete existing FORCE_PROFILE rows' },
        { status: 500 }
      );
    }

    console.log('✅ Deleted all existing FORCE_PROFILE rows');

    // 2. Get all unique athletes who have test data
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_percentile_history')
      .select('athlete_id')
      .neq('test_type', 'FORCE_PROFILE')
      .order('athlete_id');

    if (athletesError || !athletes) {
      return NextResponse.json(
        { error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    // Get unique athlete IDs
    const uniqueAthleteIds = Array.from(new Set(athletes.map(a => a.athlete_id)));

    console.log(`Found ${uniqueAthleteIds.length} athletes with test data`);

    // 3. Recalculate composite score for each athlete
    const results = {
      total: uniqueAthleteIds.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const athleteId of uniqueAthleteIds) {
      try {
        const compositeScore = await updateCompositeScoreOverall(supabase, athleteId);

        if (compositeScore !== null) {
          results.created++;
          console.log(`✅ Created FORCE_PROFILE for athlete ${athleteId}: ${compositeScore.toFixed(1)}`);
        } else {
          results.skipped++;
          console.log(`⏭️  Skipped athlete ${athleteId} (doesn't have all 5 tests)`);
        }
      } catch (err) {
        results.errors.push(`Athlete ${athleteId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Error processing athlete ${athleteId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recalculated all FORCE_PROFILE composite scores',
      results,
    });
  } catch (err) {
    console.error('Error in recalculate-force-profiles endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
