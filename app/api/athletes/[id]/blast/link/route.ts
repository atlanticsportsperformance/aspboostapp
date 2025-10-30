// API Route: Link Athlete to Blast Motion Player
// POST /api/athletes/[id]/blast/link
// Body: { blast_player_id: number, blast_user_id: string, blast_external_id?: string }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 3. Parse request body
    const body = await request.json();
    const { blast_player_id, blast_user_id, blast_external_id } = body;

    if (!blast_player_id || !blast_user_id) {
      return NextResponse.json(
        { error: 'blast_player_id and blast_user_id are required' },
        { status: 400 }
      );
    }

    // 4. Verify athlete exists and belongs to user's org
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, org_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Check org access (admins can only access their org's athletes)
    if (profile.app_role !== 'super_admin' && athlete.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Check if Blast Motion player is already linked to another athlete
    const { data: existingLink } = await supabase
      .from('athletes')
      .select('id, first_name, last_name')
      .eq('blast_player_id', blast_player_id)
      .neq('id', athleteId)
      .single();

    if (existingLink) {
      return NextResponse.json(
        {
          error: 'Blast Motion player already linked',
          message: `This Blast Motion player is already linked to ${existingLink.first_name} ${existingLink.last_name}`,
        },
        { status: 409 }
      );
    }

    // 6. Link athlete to Blast Motion player
    const { error: updateError } = await supabase
      .from('athletes')
      .update({
        blast_player_id: blast_player_id,
        blast_user_id: blast_user_id,
        blast_external_id: blast_external_id || null,
        blast_synced_at: null, // Clear sync timestamp since we haven't synced yet
        blast_sync_error: null, // Clear any previous errors
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error linking athlete to Blast Motion:', updateError);
      return NextResponse.json(
        { error: 'Failed to link athlete', message: updateError.message },
        { status: 500 }
      );
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'Athlete successfully linked to Blast Motion player',
      athlete_id: athleteId,
      blast_player_id: blast_player_id,
    });
  } catch (error) {
    console.error('Error in blast/link endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to link athlete',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/athletes/[id]/blast/link - Unlink athlete from Blast Motion
export async function DELETE(
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

    // 3. Verify athlete exists and belongs to user's org
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, org_id')
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

    // 4. Unlink athlete (this will cascade delete all blast_swings due to foreign key)
    const { error: updateError } = await supabase
      .from('athletes')
      .update({
        blast_player_id: null,
        blast_user_id: null,
        blast_external_id: null,
        blast_synced_at: null,
        blast_sync_error: null,
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error unlinking athlete from Blast Motion:', updateError);
      return NextResponse.json(
        { error: 'Failed to unlink athlete', message: updateError.message },
        { status: 500 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Athlete successfully unlinked from Blast Motion',
    });
  } catch (error) {
    console.error('Error in blast/unlink endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to unlink athlete',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
