/**
 * API Endpoint: Bulk sync VALD Force Plates for all athletes
 * POST /api/admin/force-plates/bulk-sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Bulk sync endpoint called');

    const supabase = createServiceRoleClient();

    let days = 365;
    try {
      const body = await request.json();
      days = body.days || 365;
      console.log(`📅 Syncing ${days} days of data`);
    } catch (jsonError) {
      console.warn('⚠️ Failed to parse request body, using default 365 days:', jsonError);
    }

    // Get all athletes with VALD profiles
    console.log('📋 Fetching athletes with VALD profiles...');
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, vald_profile_id, first_name, last_name, play_level')
      .not('vald_profile_id', 'is', null);

    if (athletesError) {
      console.error('❌ Failed to fetch athletes:', athletesError);
      return NextResponse.json(
        { error: 'Failed to fetch athletes', details: athletesError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${athletes?.length || 0} athletes with VALD profiles`);

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No athletes with VALD profiles found',
        results: [],
      });
    }

    // Trigger sync for each athlete
    const results: any[] = [];
    const baseUrl = request.nextUrl.origin;

    for (const athlete of athletes) {
      console.log(`\n🔄 Syncing ${athlete.first_name} ${athlete.last_name}...`);

      try {
        // Call the individual athlete sync endpoint with internal API key
        const response = await fetch(
          `${baseUrl}/api/athletes/${athlete.id}/vald/sync?daysBack=${days}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
            },
          }
        );

        const syncResult = await response.json();

        results.push({
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          success: syncResult.success,
          syncedCount: syncResult.syncedCount || 0,
          message: syncResult.message || syncResult.error,
        });

        console.log(
          syncResult.success
            ? `  ✅ ${syncResult.syncedCount} tests synced`
            : `  ❌ ${syncResult.error || 'Failed'}`
        );
      } catch (err) {
        console.error(`  ❌ Exception:`, err);
        results.push({
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          success: false,
          syncedCount: 0,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const totalTests = results.reduce((sum, r) => sum + r.syncedCount, 0);

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTests} tests across ${successCount}/${athletes.length} athletes`,
      summary: {
        totalAthletes: athletes.length,
        successfulSyncs: successCount,
        failedSyncs: athletes.length - successCount,
        totalTestsSynced: totalTests,
      },
      results,
    });
  } catch (err) {
    console.error('❌ Bulk sync error:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to execute bulk sync',
        details: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
