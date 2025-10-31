/**
 * Vercel Cron Job: Nightly Force Plate Sync
 * Runs daily at 2:00 AM EST
 * Syncs past 24 hours of VALD Force Plate data for all athletes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🌙 Starting nightly Force Plate sync...');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const supabase = createServiceRoleClient();

    // Get all athletes with VALD profiles
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, vald_profile_id, first_name, last_name, play_level')
      .not('vald_profile_id', 'is', null);

    if (athletesError) {
      console.error('Failed to fetch athletes:', athletesError);
      return NextResponse.json(
        { error: 'Failed to fetch athletes', details: athletesError.message },
        { status: 500 }
      );
    }

    if (!athletes || athletes.length === 0) {
      console.log('No athletes with VALD profiles found');
      return NextResponse.json({
        success: true,
        message: 'No athletes to sync',
        summary: {
          totalAthletes: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          totalTestsSynced: 0,
        },
      });
    }

    console.log(`Found ${athletes.length} athletes with VALD profiles`);

    // Sync each athlete (past 24 hours only)
    const results: any[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const athlete of athletes) {
      console.log(`Syncing ${athlete.first_name} ${athlete.last_name}...`);

      try {
        const response = await fetch(
          `${baseUrl}/api/athletes/${athlete.id}/vald/sync?daysBack=1`,
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

    console.log('\n📊 Nightly sync summary:');
    console.log(`  Total athletes: ${athletes.length}`);
    console.log(`  Successful syncs: ${successCount}`);
    console.log(`  Failed syncs: ${athletes.length - successCount}`);
    console.log(`  Total tests synced: ${totalTests}`);

    return NextResponse.json({
      success: true,
      message: `Nightly sync completed: ${totalTests} tests across ${successCount}/${athletes.length} athletes`,
      summary: {
        totalAthletes: athletes.length,
        successfulSyncs: successCount,
        failedSyncs: athletes.length - successCount,
        totalTestsSynced: totalTests,
      },
      results,
    });
  } catch (err) {
    console.error('Nightly sync error:', err);
    return NextResponse.json(
      {
        error: 'Failed to execute nightly sync',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
