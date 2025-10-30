import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('app_role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only coaches, admins, and super_admins can search Blast Motion
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Get Blast Motion API credentials from organization settings
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('blast_api_username, blast_api_password')
      .eq('organization_id', profile.organization_id)
      .single();

    if (!orgSettings?.blast_api_username || !orgSettings?.blast_api_password) {
      return NextResponse.json({
        success: false,
        players: [],
        message: 'Blast Motion API not configured',
      });
    }

    // Search Blast Motion for player
    const blastAPI = createBlastMotionAPI(
      orgSettings.blast_api_username,
      orgSettings.blast_api_password
    );

    const players = await blastAPI.searchPlayer(query);

    return NextResponse.json({
      success: true,
      players: players.map(p => ({
        id: p.id,
        blast_user_id: p.blast_user_id,
        name: p.name,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        position: p.position,
        handedness: p.handedness,
        total_actions: p.total_actions,
      })),
    });
  } catch (error) {
    console.error('Error searching Blast Motion:', error);
    return NextResponse.json({
      success: false,
      players: [],
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
