import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAndLinkVALDProfile, linkExistingVALDProfile } from '@/lib/vald/create-profile';

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

    // Only coaches, admins, and super_admins can create athletes
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only coaches and admins can create athletes.' },
        { status: 403 }
      );
    }

    // Get org_id from organizations table or staff table
    // First check if user is staff and has an org
    const { data: staffData } = await supabase
      .from('staff')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    let org_id = staffData?.org_id;

    // If no staff record, get first available org or create one
    if (!org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      org_id = orgData?.id || null;
    }

    // Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      sex,
      primaryPosition,
      secondaryPosition,
      gradYear,
      playLevel,
      createValdProfile,
      linkExistingVald,
      existingValdProfileId,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    if (createValdProfile && !birthDate) {
      return NextResponse.json(
        { error: 'Birth date is required to create a VALD profile' },
        { status: 400 }
      );
    }

    if (linkExistingVald && !existingValdProfileId) {
      return NextResponse.json(
        { error: 'VALD profile ID is required when linking existing profile' },
        { status: 400 }
      );
    }

    // Check if email already exists in athletes table
    const { data: existingAthlete, error: emailCheckError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, email')
      .eq('email', email)
      .single();

    if (existingAthlete) {
      return NextResponse.json(
        {
          error: `An athlete with email "${email}" already exists: ${existingAthlete.first_name} ${existingAthlete.last_name}. Please use a different email address.`,
          existingAthleteId: existingAthlete.id
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create the athlete record with name stored directly (like Evan's schema)
    const { data: newAthlete, error: athleteError } = await supabase
      .from('athletes')
      .insert({
        org_id: org_id,
        user_id: null, // Athletes don't need login accounts
        first_name: firstName,
        last_name: lastName,
        email: email,
        date_of_birth: birthDate || null,
        primary_position: primaryPosition || null,
        secondary_position: secondaryPosition || null,
        grad_year: gradYear || null,
        is_active: true,
      })
      .select()
      .single();

    if (athleteError || !newAthlete) {
      console.error('Error creating athlete:', athleteError);
      return NextResponse.json(
        { error: 'Failed to create athlete: ' + (athleteError?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    let valdProfileCreated = false;
    let valdProfileLinked = false;
    let valdError: string | null = null;

    // Handle VALD integration
    if (createValdProfile) {
      try {
        const valdProfileId = await createAndLinkVALDProfile(supabase, {
          athleteId: newAthlete.id,
          firstName,
          lastName,
          email,
          birthDate: new Date(birthDate),
          sex,
        });

        if (valdProfileId) {
          valdProfileCreated = true;
          console.log(`✅ Created and linked VALD profile: ${valdProfileId}`);
        } else {
          valdError = 'VALD profile creation initiated but profileId not yet available. Will be resolved on first sync.';
          console.warn('⚠️ VALD profile created but profileId pending');
        }
      } catch (error) {
        valdError = error instanceof Error ? error.message : 'Unknown error creating VALD profile';
        console.error('Error creating VALD profile:', error);
        // Don't fail the whole request - athlete was still created
      }
    } else if (linkExistingVald && existingValdProfileId) {
      try {
        const linked = await linkExistingVALDProfile(
          supabase,
          newAthlete.id,
          existingValdProfileId
        );

        if (linked) {
          valdProfileLinked = true;
          console.log(`✅ Linked existing VALD profile: ${existingValdProfileId}`);
        } else {
          valdError = 'Failed to link existing VALD profile';
          console.error('Failed to link existing VALD profile');
        }
      } catch (error) {
        valdError = error instanceof Error ? error.message : 'Unknown error linking VALD profile';
        console.error('Error linking VALD profile:', error);
        // Don't fail the whole request - athlete was still created
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      athlete: newAthlete,
      vald_profile_created: valdProfileCreated,
      vald_profile_linked: valdProfileLinked,
      vald_error: valdError,
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error creating athlete:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
