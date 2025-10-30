// API Route: Get Paginated Blast Motion Swings for Athlete
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset = (page - 1) * perPage;

    // Filter parameters
    const swingType = searchParams.get('swing_type'); // tee, live, bp, game, etc.
    const timeRange = searchParams.get('time_range'); // 7d, 30d, 90d, all

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('blast_swings')
      .select('*', { count: 'exact' })
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: false })
      .order('recorded_time', { ascending: false });

    // Apply time range filter
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      query = query.gte('recorded_date', startDate.toISOString().split('T')[0]);
    }

    // Apply swing type filter if provided
    if (swingType && swingType !== 'all') {
      query = query.eq('swing_details', swingType);
    }

    // Apply pagination
    query = query.range(offset, offset + perPage - 1);

    const { data: swings, error, count } = await query;

    if (error) {
      console.error('Error fetching swings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch swings', details: error.message },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: swings || [],
      pagination: {
        page,
        per_page: perPage,
        total_count: count || 0,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/blast/swings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
