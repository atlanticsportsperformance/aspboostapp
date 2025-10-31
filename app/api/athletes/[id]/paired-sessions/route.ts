import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchSwingsByTime, groupSwingPairsIntoSessions } from '@/lib/paired-data/matching';
import { BlastSwing, HitTraxSwing, PairedSessionsResponse } from '@/lib/paired-data/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = await createClient();

    // Get query parameters for configuration
    const searchParams = request.nextUrl.searchParams;
    // Default to 10 seconds based on analysis showing 25% improvement over 5s threshold
    // Analysis showed: 30 matches at 5s, 44 matches at 10s (+14 swings, +25%)
    const maxTimeDifferenceSeconds = parseInt(searchParams.get('maxTimeDiff') || '10', 10);
    const dateFilter = searchParams.get('date'); // Optional: filter by specific date

    // =========================================================================
    // 1. Fetch all Blast swings for this athlete
    // =========================================================================
    // NOTE: Order by created_at_utc instead of recorded_date/time since those are UTC
    let blastQuery = supabase
      .from('blast_swings')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at_utc', { ascending: false });

    if (dateFilter) {
      blastQuery = blastQuery.eq('recorded_date', dateFilter);
    }

    const { data: blastSwings, error: blastError } = await blastQuery;

    if (blastError) {
      console.error('Error fetching Blast swings:', blastError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Blast swings' },
        { status: 500 }
      );
    }

    // =========================================================================
    // 2. Fetch all HitTrax swings for this athlete (via sessions)
    // =========================================================================

    // First get all HitTrax sessions for this athlete
    let sessionsQuery = supabase
      .from('hittrax_sessions')
      .select('id, session_date')
      .eq('athlete_id', athleteId)
      .order('session_date', { ascending: false });

    if (dateFilter) {
      sessionsQuery = sessionsQuery.eq('session_date', dateFilter);
    }

    const { data: hittraxSessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Error fetching HitTrax sessions:', sessionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch HitTrax sessions' },
        { status: 500 }
      );
    }

    // Get all swings from these sessions
    let hittraxSwings: HitTraxSwing[] = [];

    if (hittraxSessions && hittraxSessions.length > 0) {
      const sessionIds = hittraxSessions.map(s => s.id);

      const { data: swings, error: swingsError } = await supabase
        .from('hittrax_swings')
        .select('*')
        .in('session_id', sessionIds)
        .order('swing_timestamp', { ascending: false });

      if (swingsError) {
        console.error('Error fetching HitTrax swings:', swingsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch HitTrax swings' },
          { status: 500 }
        );
      }

      hittraxSwings = swings || [];
    }

    // =========================================================================
    // 3. Match swings by timestamp proximity
    // =========================================================================
    const swingPairs = matchSwingsByTime(
      blastSwings as BlastSwing[],
      hittraxSwings as HitTraxSwing[],
      maxTimeDifferenceSeconds
    );

    // =========================================================================
    // 4. Group swing pairs into sessions
    // =========================================================================
    const pairedSessions = groupSwingPairsIntoSessions(swingPairs, athleteId);

    // =========================================================================
    // 5. Calculate statistics
    // =========================================================================
    const totalSessions = pairedSessions.length;
    const pairedSessionsCount = pairedSessions.filter(
      s => s.blastSession && s.hittraxSession
    ).length;
    const blastOnlySessionsCount = pairedSessions.filter(
      s => s.blastSession && !s.hittraxSession
    ).length;
    const hittraxOnlySessionsCount = pairedSessions.filter(
      s => !s.blastSession && s.hittraxSession
    ).length;

    // Calculate average match confidence for paired sessions
    const pairedSessionsWithConfidence = pairedSessions.filter(
      s => s.blastSession && s.hittraxSession && s.matchConfidence > 0
    );
    const avgMatchConfidence = pairedSessionsWithConfidence.length > 0
      ? pairedSessionsWithConfidence.reduce((sum, s) => sum + s.matchConfidence, 0) / pairedSessionsWithConfidence.length
      : 0;

    // =========================================================================
    // 6. Return response
    // =========================================================================
    const response: PairedSessionsResponse = {
      success: true,
      data: pairedSessions,
      stats: {
        totalSessions,
        pairedSessions: pairedSessionsCount,
        blastOnlySessions: blastOnlySessionsCount,
        hittraxOnlySessions: hittraxOnlySessionsCount,
        avgMatchConfidence,
      },
      config: {
        windowMinutes: maxTimeDifferenceSeconds / 60,
        minConfidenceThreshold: 0.5,
        maxTimeGapMinutes: maxTimeDifferenceSeconds / 60,
        requireSwingCountSimilarity: false,
        swingCountTolerancePercent: 50,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in paired-sessions API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
