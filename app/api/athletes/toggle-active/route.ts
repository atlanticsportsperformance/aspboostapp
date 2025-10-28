import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { athleteId, isActive } = body;

    if (!athleteId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Athlete ID and isActive (boolean) are required' },
        { status: 400 }
      );
    }

    // Update athlete status
    const { error: updateError } = await supabase
      .from('athletes')
      .update({ is_active: isActive })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error updating athlete status:', updateError);
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isActive,
      message: `Athlete ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Unexpected error toggling athlete status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
