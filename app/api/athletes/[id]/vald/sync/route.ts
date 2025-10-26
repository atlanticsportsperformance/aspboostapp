// API Endpoint: Sync VALD tests for a specific athlete
// POST /api/athletes/[id]/vald/sync

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const athleteId = params.id;
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
      .select('id, vald_profile_id, vald_sync_id, org_id, user_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // 4. Verify athlete is in same org as user
    if (athlete.org_id !== profile.org_id) {
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

    // 6. Get latest test date for incremental sync
    const latestDate = await getLatestTestDate(supabase, athleteId);
    const modifiedFromUtc = latestDate.toISOString();

    console.log(`Syncing tests for athlete ${athleteId} from ${modifiedFromUtc}...`);

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
    let syncedCount = 0;
    const errors: string[] = [];

    for (const test of tests) {
      try {
        console.log(`Processing ${test.testType} test ${test.testId}...`);

        // Get trials for the test
        const trials = await valdApi.getTrials(test.testId);

        if (!trials || trials.length === 0) {
          console.warn(`No trials found for test ${test.testId}`);
          continue;
        }

        // Store based on test type
        let success = false;

        switch (test.testType) {
          case 'CMJ':
            success = await storeCMJTest(supabase, trials, test.testId, athleteId);
            break;
          case 'SJ':
            success = await storeSJTest(supabase, trials, test.testId, athleteId);
            break;
          case 'HJ':
            success = await storeHJTest(supabase, trials, test.testId, athleteId);
            break;
          case 'PPU':
            success = await storePPUTest(supabase, trials, test.testId, athleteId);
            break;
          case 'IMTP':
            success = await storeIMTPTest(
              supabase,
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

    // 9. Update athlete's last sync timestamp
    await supabase
      .from('athletes')
      .update({
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    // 10. Return response
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
