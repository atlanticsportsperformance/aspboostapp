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
    let latestTestDate: Date | null = null;

    // Get athlete's play level
    const { data: athlete } = await supabase
      .from('athletes')
      .select('play_level')
      .eq('id', athleteId)
      .single();

    if (!athlete?.play_level) {
      console.log(`Athlete ${athleteId} has no play level set`);
      return null;
    }

    // Get the latest percentile_play_level for each test type
    for (const testType of testTypes) {
      const { data: latestEntry } = await supabase
        .from('athlete_percentile_history')
        .select('percentile_play_level, test_date')
        .eq('athlete_id', athleteId)
        .eq('test_type', testType)
        .eq('play_level', athlete.play_level)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (latestEntry?.percentile_play_level !== null && latestEntry?.percentile_play_level !== undefined) {
        latestPercentiles.push(latestEntry.percentile_play_level);

        // Track the most recent test date
        const testDate = new Date(latestEntry.test_date);
        if (!latestTestDate || testDate > latestTestDate) {
          latestTestDate = testDate;
        }
      }
    }

    // Calculate overall composite score (average of all test type percentiles)
    const compositeScoreOverall = latestPercentiles.length > 0
      ? latestPercentiles.reduce((sum, p) => sum + p, 0) / latestPercentiles.length
      : null;

    if (compositeScoreOverall === null || !latestTestDate) {
      console.log(`No percentile data found for athlete ${athleteId}`);
      return null;
    }

    // Insert or update FORCE_PROFILE row with composite score
    // Check if a FORCE_PROFILE row exists for this date
    const { data: existingForceProfile } = await supabase
      .from('athlete_percentile_history')
      .select('id')
      .eq('athlete_id', athleteId)
      .eq('test_type', 'FORCE_PROFILE')
      .eq('play_level', athlete.play_level)
      .gte('test_date', latestTestDate.toISOString())
      .single();

    if (existingForceProfile) {
      // Update existing row
      const { error } = await supabase
        .from('athlete_percentile_history')
        .update({
          percentile_overall: compositeScoreOverall,
          test_date: latestTestDate.toISOString(),
        })
        .eq('id', existingForceProfile.id);

      if (error) {
        console.error('Error updating FORCE_PROFILE row:', error);
        return null;
      }
    } else {
      // Insert new FORCE_PROFILE row
      const { error } = await supabase
        .from('athlete_percentile_history')
        .insert({
          athlete_id: athleteId,
          test_type: 'FORCE_PROFILE',
          test_date: latestTestDate.toISOString(),
          test_id: null,
          play_level: athlete.play_level,
          metric_name: null,
          value: null,
          percentile_play_level: null,
          percentile_overall: compositeScoreOverall,
        });

      if (error) {
        console.error('Error inserting FORCE_PROFILE row:', error);
        return null;
      }
    }

    console.log(`✅ Created/updated FORCE_PROFILE row with composite score ${compositeScoreOverall.toFixed(1)} for athlete ${athleteId}`);

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
