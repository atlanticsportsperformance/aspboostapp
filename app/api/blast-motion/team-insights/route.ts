// API Route: Fetch Blast Motion Team Insights
// GET /api/blast-motion/team-insights

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
      .select('app_role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get date range from query params (default: last 365 days)
    const searchParams = request.nextUrl.searchParams;
    const daysBack = parseInt(searchParams.get('daysBack') || '365');

    const dateEnd = new Date().toISOString().split('T')[0];
    const dateStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 4. Get Blast Motion credentials from env
    const username = process.env.BLAST_MOTION_USERNAME;
    const password = process.env.BLAST_MOTION_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Blast Motion credentials not configured' },
        { status: 500 }
      );
    }

    // 5. Fetch data from Blast Motion API
    const api = createBlastMotionAPI(username, password);

    const teamInsights = await api.getTeamInsights({
      dateStart,
      dateEnd,
      page: 1,
      perPage: 100, // Get all players
    });

    // 6. Return data
    return NextResponse.json({
      success: true,
      data: teamInsights.data,
      date_range: {
        start: dateStart,
        end: dateEnd,
        days: daysBack,
      },
    });
  } catch (error) {
    console.error('Error fetching Blast Motion team insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch team insights',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
