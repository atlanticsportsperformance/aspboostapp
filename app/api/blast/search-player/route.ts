import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

export async function GET(request: NextRequest) {
  console.log('🔍 Blast Motion Search API called - v2');

  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ User authenticated: ${user.email}`);

    // Get user's profile and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('app_role, org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('❌ Profile not found:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log(`👤 User role: ${profile.app_role}`);

    // Only coaches, admins, and super_admins can search Blast Motion
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      console.log('❌ Insufficient permissions');
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    console.log(`🔎 Search query: "${query}"`);

    if (!query) {
      console.log('❌ No query parameter');
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Get Blast Motion API credentials from environment variables
    const blastUsername = process.env.BLAST_MOTION_USERNAME;
    const blastPassword = process.env.BLAST_MOTION_PASSWORD;

    if (!blastUsername || !blastPassword) {
      console.log('⚠️ Blast Motion API credentials not configured in environment');
      return NextResponse.json({
        success: false,
        players: [],
        message: 'Blast Motion API not configured',
      });
    }

    console.log(`🔍 Searching Blast Motion with username: ${blastUsername}`);

    // Search Blast Motion for player
    const blastAPI = createBlastMotionAPI(blastUsername, blastPassword);

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
