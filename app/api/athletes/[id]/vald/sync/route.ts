// API Endpoint: Sync VALD tests for a specific athlete
// POST /api/athletes/[id]/vald/sync

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SimpleVALDForceDecksAPI } from '@/lib/vald/forcedecks-api';
import {
  storeCMJTest,
  storeSJTest,
  storeHJTest,
  storePPUTest,
  storeIMTPTest,
  getLatestTestDate,
} from '@/lib/vald/store-test';
import { resolveVALDProfileId } from '@/lib/vald/create-profile';
import { saveTestPercentileHistory } from '@/lib/vald/save-percentile-history';
import { updateCompositeScoreAfterSync } from '@/lib/vald/update-composite-score';
import { calculateForceProfileComposite } from '@/lib/vald/calculate-force-profile-composite';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check user has permission (coach/admin/super_admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get athlete with VALD profile info
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, vald_profile_id, vald_sync_id, org_id, user_id, play_level')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // 4. Verify athlete is in same org as user (super_admin can access all orgs)
    if (profile.app_role !== 'super_admin' && athlete.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Resolve VALD profileId if not present
    let valdProfileId = athlete.vald_profile_id;

    if (!valdProfileId && athlete.vald_sync_id) {
      console.log('Attempting to resolve VALD profileId...');
      valdProfileId = await resolveVALDProfileId(supabase, athleteId);
    }

    if (!valdProfileId) {
      return NextResponse.json(
        {
          error: 'No VALD profile linked to this athlete',
          message:
            'Please create a VALD profile for this athlete first, or wait for profile creation to complete.',
        },
        { status: 400 }
      );
    }

    // Get athlete's play level for percentile calculations
    const playLevel = athlete.play_level;

    console.log(`Athlete play level: ${playLevel}`);

    if (!playLevel) {
      return NextResponse.json(
        {
          error: 'Athlete has no play level set',
          message: 'Please set the athlete\'s play level (Youth, High School, College, Pro) before syncing VALD tests.',
        },
        { status: 400 }
      );
    }

    // 6. Get latest test date for incremental sync
    // WORKAROUND: Go back 180 days instead of using latest test date
    // This is because VALD's ModifiedFromUtc filters by when test was analyzed, not recorded
    // So tests can be recorded earlier but analyzed later, causing them to be skipped
    const daysBack = 180;
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - daysBack);
    const modifiedFromUtc = lookbackDate.toISOString();

    console.log(`Syncing tests for athlete ${athleteId} from ${modifiedFromUtc} (${daysBack} days back)...`);

    // 7. Fetch new tests from VALD
    const valdApi = new SimpleVALDForceDecksAPI();
    const testsResponse = await valdApi.getTests(modifiedFromUtc, valdProfileId);
    const tests = testsResponse.tests || [];

    console.log(`Found ${tests.length} test(s) to sync`);

    if (tests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new tests to sync',
        tests_synced: 0,
        sync_timestamp: new Date().toISOString(),
      });
    }

    // 8. Store each test based on type
    // Use service role client to bypass RLS for inserting test data
    const serviceSupabase = createServiceRoleClient();
    let syncedCount = 0;
    const errors: string[] = [];

    for (const test of tests) {
      try {
        console.log(`Processing ${test.testType} test ${test.testId}...`);

        // Check if test already exists (tests are immutable once synced)
        const testTableMap: Record<string, string> = {
          'CMJ': 'cmj_tests',
          'SJ': 'sj_tests',
          'HJ': 'hj_tests',
          'PPU': 'ppu_tests',
          'IMTP': 'imtp_tests',
        };

        const { data: existingTest } = await serviceSupabase
          .from(testTableMap[test.testType])
          .select('*')
          .eq('test_id', test.testId)
          .eq('athlete_id', athleteId)
          .single();

        // If test already exists, skip storing but STILL save percentile history
        if (existingTest) {
          console.log(`⏭️  Test ${test.testType} ${test.testId} already exists, updating percentile history only...`);

          // Save/update percentile history for this existing test
          if (playLevel) {
            const historySuccess = await saveTestPercentileHistory(
              serviceSupabase,
              athleteId,
              test.testType as any,
              test.testId,
              existingTest,
              new Date(test.testDate || existingTest.recorded_utc),
              playLevel
            );

            if (historySuccess) {
              console.log(`✅ Updated percentile history for ${test.testType} test ${test.testId}`);
            } else {
              console.error(`❌ Failed to update percentile history for ${test.testType} test ${test.testId}`);
            }
          }

          continue; // Skip the rest (don't re-store test data)
        }

        // Get trials for the test
        const trials = await valdApi.getTrials(test.testId);

        if (!trials || trials.length === 0) {
          console.warn(`No trials found for test ${test.testId}`);
          continue;
        }

        // Store based on test type using service role client
        let success = false;

        switch (test.testType) {
          case 'CMJ':
            success = await storeCMJTest(serviceSupabase, trials, test.testId, athleteId);
            break;
          case 'SJ':
            success = await storeSJTest(serviceSupabase, trials, test.testId, athleteId);
            break;
          case 'HJ':
            success = await storeHJTest(serviceSupabase, trials, test.testId, athleteId);
            break;
          case 'PPU':
            success = await storePPUTest(serviceSupabase, trials, test.testId, athleteId);
            break;
          case 'IMTP':
            success = await storeIMTPTest(
              serviceSupabase,
              trials,
              test.testId,
              athleteId,
              valdProfileId
            );
            break;
          default:
            console.warn(`Unknown test type: ${test.testType}`);
            errors.push(`Unknown test type: ${test.testType}`);
            continue;
        }

        if (success) {
          syncedCount++;

          // Update athlete bodyweight from most recent CMJ test
          if (test.testType === 'CMJ') {
            try {
              // Get the most recent CMJ test to ensure we always show latest weight
              const { data: latestCmjTest } = await serviceSupabase
                .from('cmj_tests')
                .select('body_weight_trial_value, recorded_utc')
                .eq('athlete_id', athleteId)
                .not('body_weight_trial_value', 'is', null)
                .order('recorded_utc', { ascending: false })
                .limit(1)
                .single();

              if (latestCmjTest && latestCmjTest.body_weight_trial_value) {
                // Convert kg to lbs (1 kg = 2.20462 lbs)
                const weightLbs = latestCmjTest.body_weight_trial_value * 2.20462;

                await serviceSupabase
                  .from('athletes')
                  .update({ weight_lbs: Math.round(weightLbs * 10) / 10 }) // Round to 1 decimal
                  .eq('id', athleteId);

                console.log(`✅ Updated athlete bodyweight to ${weightLbs.toFixed(1)} lbs from most recent CMJ test (${latestCmjTest.recorded_utc})`);
              }
            } catch (bwError) {
              console.error('Error updating bodyweight from CMJ:', bwError);
              // Don't fail the sync if bodyweight update fails
            }
          }

          // Save percentile history for this test
          try {
            console.log(`📊 Calculating percentiles for ${test.testType} test ${test.testId}...`);

            // Get the stored test data to calculate percentiles
            const testTableMap: Record<string, string> = {
              'CMJ': 'cmj_tests',
              'SJ': 'sj_tests',
              'HJ': 'hj_tests',
              'PPU': 'ppu_tests',
              'IMTP': 'imtp_tests',
            };

            const { data: storedTest, error: storedTestError } = await serviceSupabase
              .from(testTableMap[test.testType])
              .select('*')
              .eq('test_id', test.testId)
              .eq('athlete_id', athleteId)
              .single();

            if (storedTestError) {
              console.error(`Error fetching stored test for percentile calculation:`, storedTestError);
            }

            if (storedTest && playLevel) {
              console.log(`   Play level: ${playLevel}, Test date: ${test.testDate || storedTest.recorded_utc}`);

              const success = await saveTestPercentileHistory(
                serviceSupabase,
                athleteId,
                test.testType as any,
                test.testId,
                storedTest,
                new Date(test.testDate || storedTest.recorded_utc),
                playLevel
              );

              if (success) {
                console.log(`✅ Saved percentile history for ${test.testType} test ${test.testId} (${playLevel} + Overall)`);
              } else {
                console.error(`❌ Failed to save percentile history for ${test.testType} test ${test.testId}`);
              }
            } else {
              console.warn(`⚠️ Cannot save percentiles: storedTest=${!!storedTest}, playLevel=${playLevel}`);
            }
          } catch (percentileError) {
            console.error(`❌ Exception saving percentile history for ${test.testId}:`, percentileError);
            if (percentileError instanceof Error) {
              console.error(`   Error message: ${percentileError.message}`);
              console.error(`   Stack trace:`, percentileError.stack);
            }
            // Don't fail the sync if percentile save fails
          }
        } else {
          errors.push(`Failed to store ${test.testType} test ${test.testId}`);
        }
      } catch (testError) {
        const errorMessage =
          testError instanceof Error ? testError.message : 'Unknown error';
        console.error(`Error processing test ${test.testId}:`, errorMessage);
        errors.push(`Error processing test ${test.testId}: ${errorMessage}`);
      }
    }

    // 9. Calculate and update composite_score_overall
    if (syncedCount > 0 && playLevel) {
      try {
        await updateCompositeScoreAfterSync(serviceSupabase, athleteId);
      } catch (compositeError) {
        console.error('Error updating composite score:', compositeError);
        // Don't fail the sync if composite score calculation fails
      }
    }

    // 9b. Calculate Overall Force Profile Composite Score (average of SJ, HJ, PPU, IMTP - no CMJ)
    if (playLevel) {
      try {
        console.log('\n📊 Calculating Overall Force Profile Composite Score...');
        await calculateForceProfileComposite(serviceSupabase, athleteId, playLevel);
      } catch (forceProfileError) {
        console.error('Error calculating force profile composite:', forceProfileError);
        // Don't fail the sync if force profile calculation fails
      }
    }

    // 10. Update athlete's last sync timestamp
    await supabase
      .from('athletes')
      .update({
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    // 11. Return response
    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} of ${tests.length} test(s)`,
      tests_synced: syncedCount,
      total_tests_found: tests.length,
      sync_timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('VALD sync error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
