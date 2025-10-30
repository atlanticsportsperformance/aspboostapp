// API Route: Search Blast Motion Players by Name
// GET /api/blast-motion/search-players?name=John

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

export async function GET(request: NextRequest) {
  try {
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
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get search query
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }

    // 4. Get Blast Motion credentials
    const username = process.env.BLAST_MOTION_USERNAME;
    const password = process.env.BLAST_MOTION_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Blast Motion credentials not configured' },
        { status: 500 }
      );
    }

    // 5. Search for players in Blast Motion
    const api = createBlastMotionAPI(username, password);
    const results = await api.searchPlayer(name.trim());

    // 6. Return search results
    return NextResponse.json({
      success: true,
      query: name.trim(),
      results: results.map((player) => ({
        id: player.id,
        blast_user_id: player.blast_user_id,
        external_id: player.external_id,
        name: player.name,
        first_name: player.first_name,
        last_name: player.last_name,
        email: player.email,
        jersey_number: player.jersey_number,
        position: player.position,
        total_swings: player.total_actions,
      })),
    });
  } catch (error) {
    console.error('Error searching Blast Motion players:', error);
    return NextResponse.json(
      {
        error: 'Failed to search players',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
