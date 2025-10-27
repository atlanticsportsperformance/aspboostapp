/**
 * Update the composite_score_overall for all recent percentile history entries
 *
 * composite_score_overall = average of latest percentile from each test type
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate and update composite_score_overall for an athlete
 *
 * This gets the latest percentile for each test type and averages them.
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete UUID
 */
export async function updateCompositeScoreOverall(
  supabase: SupabaseClient,
  athleteId: string
): Promise<number | null> {
  try {
    const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];
    const latestPercentiles: number[] = [];

    // Get the latest percentile for each test type
    for (const testType of testTypes) {
      const { data: latestEntry } = await supabase
        .from('athlete_percentile_history')
        .select('composite_score_level')
        .eq('athlete_id', athleteId)
        .eq('test_type', testType)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (latestEntry?.composite_score_level !== null && latestEntry?.composite_score_level !== undefined) {
        latestPercentiles.push(latestEntry.composite_score_level);
      }
    }

    // Calculate overall composite score (average of all test types)
    const compositeScoreOverall = latestPercentiles.length > 0
      ? latestPercentiles.reduce((sum, p) => sum + p, 0) / latestPercentiles.length
      : null;

    if (compositeScoreOverall === null) {
      console.log(`No percentile data found for athlete ${athleteId}`);
      return null;
    }

    // Update all recent entries (last 30 days) with this composite score
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('athlete_percentile_history')
      .update({ composite_score_overall: compositeScoreOverall })
      .eq('athlete_id', athleteId)
      .gte('test_date', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error updating composite_score_overall:', error);
      return null;
    }

    console.log(`✅ Updated composite_score_overall to ${compositeScoreOverall.toFixed(1)} for athlete ${athleteId}`);

    // Also update the athlete's vald_composite_score field
    await supabase
      .from('athletes')
      .update({ vald_composite_score: compositeScoreOverall })
      .eq('id', athleteId);

    return compositeScoreOverall;
  } catch (err) {
    console.error('Error in updateCompositeScoreOverall:', err);
    return null;
  }
}

/**
 * Update composite_score_overall immediately after syncing new tests
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete UUID
 */
export async function updateCompositeScoreAfterSync(
  supabase: SupabaseClient,
  athleteId: string
): Promise<void> {
  console.log(`Calculating composite score for athlete ${athleteId}...`);
  await updateCompositeScoreOverall(supabase, athleteId);
}
