import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    const supabase = createServiceRoleClient();

    // Get athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json({ error: 'Athlete not found', details: athleteError }, { status: 404 });
    }

    // Get percentile history
    const { data: history, error: historyError } = await supabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId);

    // Get test counts
    const testTables = ['vald_cmj_tests', 'vald_sj_tests', 'vald_hj_tests', 'vald_imtp_tests', 'vald_ppu_tests'];
    const testCounts: Record<string, number> = {};

    for (const table of testTables) {
      const { data, error } = await supabase
        .from(table)
        .select('test_id')
        .eq('athlete_id', athleteId);

      testCounts[table] = data?.length || 0;
    }

    return NextResponse.json({
      athlete: {
        id: athlete.id,
        name: `${athlete.first_name} ${athlete.last_name}`,
        vald_profile_id: athlete.vald_profile_id,
        vald_sync_id: athlete.vald_sync_id,
        play_level: athlete.play_level,
      },
      percentile_history_count: history?.length || 0,
      percentile_history_error: historyError?.message || null,
      test_counts: testCounts,
      sample_percentile_row: history?.[0] || null,
      env_vars: {
        has_vald_client_id: !!process.env.VALD_CLIENT_ID,
        has_vald_client_secret: !!process.env.VALD_CLIENT_SECRET,
        has_vald_tenant_id: !!process.env.VALD_TENANT_ID,
        has_vald_api_url: !!process.env.VALD_PROFILE_API_URL,
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', stack: err instanceof Error ? err.stack : null },
      { status: 500 }
    );
  }
}
