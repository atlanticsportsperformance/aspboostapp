import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
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
      birthDate,
      sex,
      primaryPosition,
      secondaryPosition,
      gradYear,
      playLevel,
      isActive,
      createLoginAccount,
      password,
      createValdProfile,
      linkExistingVald,
      existingValdProfileId,
      blastUserId,
      blastPlayerId,
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

    if (createLoginAccount && !password) {
      return NextResponse.json(
        { error: 'Password is required when creating login account' },
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

    // Check if email belongs to a VALD profile that's already linked to another athlete
    const { data: valdLinkedAthlete } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, vald_profile_id')
      .not('vald_profile_id', 'is', null)
      .eq('email', email)
      .single();

    if (valdLinkedAthlete) {
      return NextResponse.json(
        {
          error: `This email is already linked to a VALD profile for athlete: ${valdLinkedAthlete.first_name} ${valdLinkedAthlete.last_name}. Cannot create duplicate.`,
          existingAthleteId: valdLinkedAthlete.id
        },
        { status: 409 }
      );
    }

    // Check if email already has an auth account (auto-link if it does)
    let authUserId: string | null = null;
    let authAccountCreated = false;
    let authAccountLinked = false;
    let authCreationError: string | null = null;

    // First check if email already has an auth account
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: existingAuthUser } = await adminClient.auth.admin.listUsers();
    const existingUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // Email already has an auth account
      console.log(`🔍 Found existing auth user: ${existingUser.id} (${email})`);

      // CRITICAL: Check if this is a staff/admin/coach account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('app_role, first_name, last_name')
        .eq('id', existingUser.id)
        .single();

      if (existingProfile && existingProfile.app_role) {
        if (['staff', 'coach', 'admin', 'super_admin'].includes(existingProfile.app_role)) {
          return NextResponse.json(
            {
              error: `This email belongs to a ${existingProfile.app_role} account (${existingProfile.first_name} ${existingProfile.last_name}). Staff accounts cannot be converted to athlete profiles.`,
              isStaffAccount: true,
              staffRole: existingProfile.app_role
            },
            { status: 403 } // 403 Forbidden
          );
        }
      }

      // Safe to link - it's an athlete account or unassigned account
      authUserId = existingUser.id;
      authAccountLinked = true;
      console.log(`✅ Linking existing auth account for: ${email}`);
    } else if (createLoginAccount && password) {
      // No existing account, create new one if requested
      try {
        // Create the auth user with password
        const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
          }
        });

        if (createUserError) {
          throw new Error(`Failed to create auth account: ${createUserError.message}`);
        }

        if (!newUser.user) {
          throw new Error('Auth user creation returned no user');
        }

        authUserId = newUser.user.id;

        // Create profile with athlete role
        const { error: profileError } = await adminClient
          .from('profiles')
          .insert({
            id: authUserId,
            email,
            first_name: firstName,
            last_name: lastName,
            app_role: 'athlete',
          });

        if (profileError) {
          // Rollback: delete the auth user
          await adminClient.auth.admin.deleteUser(authUserId);
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        authAccountCreated = true;
        console.log(`✅ Created auth account for athlete: ${email}`);
      } catch (error) {
        authCreationError = error instanceof Error ? error.message : 'Unknown error creating auth account';
        console.error('Error creating auth account:', error);
        // Don't fail the whole request - we can create the athlete without login
        authUserId = null;
      }
    }

    // Create the athlete record with name stored directly (like Evan's schema)
    const athleteInsert: any = {
      org_id: org_id,
      user_id: authUserId, // Link to auth user if created
      first_name: firstName,
      last_name: lastName,
      email: email,
      // Note: phone is not in athletes table - it's in profiles table if needed
      date_of_birth: birthDate || null,
      primary_position: primaryPosition || null,
      secondary_position: secondaryPosition || null,
      grad_year: gradYear || null,
      play_level: playLevel, // CRITICAL: Required for percentile calculations
      is_active: isActive !== undefined ? isActive : true,
    };

    // Add Blast Motion linking if provided
    if (blastUserId) {
      athleteInsert.blast_user_id = blastUserId;
    }
    if (blastPlayerId) {
      athleteInsert.blast_player_id = blastPlayerId;
    }

    const { data: newAthlete, error: athleteError } = await supabase
      .from('athletes')
      .insert(athleteInsert)
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
      auth_account_created: authAccountCreated,
      auth_account_linked: authAccountLinked,
      auth_error: authCreationError,
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
