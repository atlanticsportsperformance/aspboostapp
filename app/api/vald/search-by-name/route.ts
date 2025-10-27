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

    // Get name from query params
    const searchParams = request.nextUrl.searchParams;
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName parameters are required' },
        { status: 400 }
      );
    }

    // Search VALD for profiles by name
    const valdProfileApi = new ValdProfileApi();
    const profiles = await valdProfileApi.searchByName(firstName, lastName);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No VALD profiles found for: ${firstName} ${lastName}`,
        profiles: [],
      });
    }

    // Return all matching profiles with email
    return NextResponse.json({
      found: true,
      count: profiles.length,
      profiles: profiles.map(p => ({
        profileId: p.profileId,
        syncId: p.syncId,
        givenName: p.givenName,
        familyName: p.familyName,
        dateOfBirth: p.dateOfBirth,
        externalId: p.externalId,
        email: p.email, // CRITICAL: Include email from VALD profile
      })),
    });

  } catch (error) {
    console.error('Error searching VALD profiles by name:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
