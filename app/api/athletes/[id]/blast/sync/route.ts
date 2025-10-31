// API Route: Sync Blast Motion Swing Data for Individual Athlete
// POST /api/athletes/[id]/blast/sync
// Body: { daysBack?: number } (optional, defaults to 365)

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: athleteId } = await params;

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

    // 3. Get athlete with Blast Motion info
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, org_id, blast_player_id, blast_user_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Check org access
    if (profile.app_role !== 'super_admin' && athlete.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if athlete is linked to Blast Motion
    if (!athlete.blast_player_id) {
      return NextResponse.json(
        {
          error: 'Athlete not linked to Blast Motion',
          message: 'Please link this athlete to a Blast Motion player first',
        },
        { status: 400 }
      );
    }

    // 4. Get date range from request body (default: last 365 days)
    const body = await request.json().catch(() => ({}));
    const daysBack = body.daysBack || 365;

    const dateEnd = new Date().toISOString().split('T')[0];
    const dateStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 5. Get Blast Motion credentials
    const username = process.env.BLAST_MOTION_USERNAME;
    const password = process.env.BLAST_MOTION_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Blast Motion credentials not configured' },
        { status: 500 }
      );
    }

    // 6. Fetch swings from Blast Motion API
    const api = createBlastMotionAPI(username, password);

    console.log(`Fetching swings for athlete ${athlete.first_name} ${athlete.last_name} (Blast Player ID: ${athlete.blast_player_id})...`);

    const allSwings = await api.getAllPlayerSwings(athlete.blast_player_id, {
      dateStart,
      dateEnd,
    });

    console.log(`Found ${allSwings.length} swings for athlete ${athlete.first_name} ${athlete.last_name}`);

    // 7. Store swings in database (use service role to bypass RLS)
    const supabaseServiceRole = createServiceRoleClient();

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const swing of allSwings) {
      try {
        // Check if swing already exists
        const { data: existing } = await supabaseServiceRole
          .from('blast_swings')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('blast_id', swing.blast_id)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Parse date and time from created_at string
        // API returns: "2025-10-29 23:16:34" (UTC timestamp as string)
        let recordedDate: string;
        let recordedTime: string;
        let createdAtUtc: string;

        if (swing.created_at && typeof swing.created_at === 'string') {
          // Parse "YYYY-MM-DD HH:MM:SS" format (UTC from Blast API)
          const parts = swing.created_at.split(' ');
          const utcDateStr = parts[0] || new Date().toISOString().split('T')[0];
          const utcTimeStr = parts[1] || '00:00:00';

          // Create UTC timestamp
          createdAtUtc = new Date(`${utcDateStr}T${utcTimeStr}Z`).toISOString();

          // Convert to local time for recorded_date/recorded_time
          const localDate = new Date(createdAtUtc);
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const hours = String(localDate.getHours()).padStart(2, '0');
          const minutes = String(localDate.getMinutes()).padStart(2, '0');
          const seconds = String(localDate.getSeconds()).padStart(2, '0');

          recordedDate = `${year}-${month}-${day}`;
          recordedTime = `${hours}:${minutes}:${seconds}`;
        } else {
          // Fallback if created_at is missing or malformed
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');

          recordedDate = `${year}-${month}-${day}`;
          recordedTime = `${hours}:${minutes}:${seconds}`;
          createdAtUtc = now.toISOString();
          console.warn(`⚠️ Missing or invalid created_at for swing ${swing.blast_id}, using current date as fallback`);
        }

        // Extract key metrics from JSONB for column storage
        const extractMetricValue = (metricKey: string): number | null => {
          const metric = swing.metrics[metricKey];
          if (!metric || !metric.value) return null;
          const parsed = parseFloat(metric.value);
          return isNaN(parsed) ? null : parsed;
        };

        // Insert new swing
        const { error: insertError } = await supabaseServiceRole
          .from('blast_swings')
          .insert({
            athlete_id: athleteId,
            blast_id: swing.blast_id,
            swing_id: swing.id,
            academy_id: swing.academy_id,
            recorded_date: recordedDate,
            recorded_time: recordedTime,
            created_at_utc: createdAtUtc,
            sport_id: swing.sport_id,
            handedness: swing.handedness,
            swing_details: swing.swing_details || null, // Swing type/environment (tee, live, bp, game, etc.)
            equipment_id: swing.equipment?.id || null,
            equipment_name: swing.equipment?.name || null,
            equipment_nickname: swing.equipment?.nick_name || null,
            has_video: swing.has_video,
            video_id: swing.video_id,
            video_url: null, // We'll implement video URL fetching later if needed
            metrics: swing.metrics,
            // Extract ALL 13 metrics as columns for fast queries
            bat_speed: extractMetricValue('swing_speed'),
            attack_angle: extractMetricValue('bat_path_angle'),
            time_to_contact: extractMetricValue('time_to_contact'),
            peak_hand_speed: extractMetricValue('peak_hand_speed'),
            on_plane_efficiency: extractMetricValue('planar_efficiency'),
            vertical_bat_angle: extractMetricValue('vertical_bat_angle'),
            plane_score: extractMetricValue('plane_score'),
            connection_score: extractMetricValue('connection_score'),
            rotation_score: extractMetricValue('rotation_score'),
            power: extractMetricValue('power'),
            rotational_acceleration: extractMetricValue('rotational_acceleration'),
            connection_at_impact: extractMetricValue('connection'),
            early_connection: extractMetricValue('early_connection'),
          });

        if (insertError) {
          // Check if it's a duplicate key violation (unique constraint)
          if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
            // Silently skip duplicates - this is expected behavior
            skippedCount++;
          } else {
            console.error(`Error inserting swing ${swing.blast_id}:`, insertError);
            errors.push(`Swing ${swing.blast_id}: ${insertError.message}`);
          }
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error(`Error processing swing ${swing.blast_id}:`, error);
        errors.push(`Swing ${swing.blast_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 8. Update athlete sync timestamp
    const { error: updateError } = await supabaseServiceRole
      .from('athletes')
      .update({
        blast_synced_at: new Date().toISOString(),
        blast_sync_error: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error updating athlete sync timestamp:', updateError);
    }

    // 9. Return sync results
    return NextResponse.json({
      success: true,
      athlete_id: athleteId,
      athlete_name: `${athlete.first_name} ${athlete.last_name}`,
      date_range: {
        start: dateStart,
        end: dateEnd,
        days: daysBack,
      },
      results: {
        total_fetched: allSwings.length,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error syncing Blast Motion data:', error);

    // Update athlete with error
    try {
      const supabaseServiceRole = createClient();
      const { id: athleteId } = await params;

      await supabaseServiceRole
        .from('athletes')
        .update({
          blast_sync_error: error instanceof Error ? error.message : 'Unknown sync error',
        })
        .eq('id', athleteId);
    } catch (updateError) {
      console.error('Error updating athlete sync error:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to sync Blast Motion data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
