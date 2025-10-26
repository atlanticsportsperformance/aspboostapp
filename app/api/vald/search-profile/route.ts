import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ValdProfileApi } from '@/lib/vald/profile-api';

export async function GET(request: NextRequest) {
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only coaches, admins, and super_admins can search VALD profiles
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get email from query params
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Search VALD for profile by email
    const valdProfileApi = new ValdProfileApi();
    const profile_data = await valdProfileApi.searchByEmail(email);

    if (!profile_data) {
      return NextResponse.json({
        found: false,
        message: `No VALD profile found for email: ${email}`,
      });
    }

    // Return the profile data
    return NextResponse.json({
      found: true,
      profile: {
        profileId: profile_data.profileId,
        syncId: profile_data.syncId,
        givenName: profile_data.givenName,
        familyName: profile_data.familyName,
        email: email,
        dateOfBirth: profile_data.dateOfBirth,
      },
    });

  } catch (error) {
    console.error('Error searching VALD profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
