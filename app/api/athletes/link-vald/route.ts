import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { athleteId, valdProfileId } = await request.json();

    if (!athleteId || !valdProfileId) {
      return NextResponse.json(
        { error: 'athleteId and valdProfileId are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated and has permission
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is coach/admin/super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the athlete with the VALD profile ID
    const { error: updateError } = await supabase
      .from('athletes')
      .update({
        vald_profile_id: valdProfileId,
        updated_at: new Date().toISOString()
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error linking VALD profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to link VALD profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'VALD profile linked successfully'
    });

  } catch (error) {
    console.error('Error in link-vald API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
