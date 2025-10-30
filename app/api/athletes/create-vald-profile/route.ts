import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAndLinkVALDProfile } from '@/lib/vald/create-profile';

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

    // Check permissions
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

    // Only coaches, admins, and super_admins can create VALD profiles
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required' },
        { status: 400 }
      );
    }

    // Get athlete information
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, email, date_of_birth, vald_profile_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Check if athlete already has a VALD profile
    if (athlete.vald_profile_id) {
      return NextResponse.json(
        { error: 'Athlete already has a VALD profile linked' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!athlete.first_name || !athlete.last_name) {
      return NextResponse.json(
        { error: 'Athlete must have first and last name' },
        { status: 400 }
      );
    }

    if (!athlete.date_of_birth) {
      return NextResponse.json(
        { error: 'Athlete must have a date of birth' },
        { status: 400 }
      );
    }

    if (!athlete.email) {
      return NextResponse.json(
        { error: 'Athlete must have an email address' },
        { status: 400 }
      );
    }

    console.log(`Creating VALD profile for athlete ${athleteId}...`);

    // Determine sex - default to 'M' if not specified
    // You may want to add a sex field to the athletes table if needed
    const sex = 'M'; // Default, you can update this based on your data model

    // Create and link VALD profile
    const valdProfileId = await createAndLinkVALDProfile(supabase, {
      athleteId: athlete.id,
      firstName: athlete.first_name,
      lastName: athlete.last_name,
      email: athlete.email,
      birthDate: new Date(athlete.date_of_birth),
      sex: sex,
    });

    if (valdProfileId) {
      console.log(`✅ Successfully created VALD profile: ${valdProfileId}`);
      return NextResponse.json({
        success: true,
        vald_profile_id: valdProfileId,
        message: 'VALD profile created successfully',
      });
    } else {
      console.warn('⚠️ VALD profile created but profileId not yet available');
      return NextResponse.json({
        success: true,
        vald_profile_id: null,
        message: 'VALD profile created but ID pending. Will be available after first sync.',
      });
    }

  } catch (error) {
    console.error('Error creating VALD profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
