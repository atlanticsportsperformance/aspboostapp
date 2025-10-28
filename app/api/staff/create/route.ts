import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      );
    }

    // Use regular client for authentication check
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can create staff.' },
        { status: 403 }
      );
    }

    // Use service role client for admin operations
    const adminClient = createServiceRoleClient();

    // Get request body
    const body = await request.json();
    const { email, firstName, lastName, phone, role, password } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current user's organization (using regular client since it's their own data)
    const { data: currentStaff } = await supabase
      .from('staff')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!currentStaff) {
      return NextResponse.json(
        { error: 'Could not determine your organization' },
        { status: 400 }
      );
    }

    // Create the auth user using admin API (with service role client)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      console.error('Full error details:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        { error: `Failed to create user: ${createError.message}` },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Create the profile (using service role client)
    // Note: Normally this would be created by a trigger, but we'll create it manually to be safe
    const { error: profileInsertError } = await adminClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        app_role: role
      });

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // If it's a duplicate key error, try updating instead
      if (profileInsertError.code === '23505') {
        const { error: profileUpdateError } = await adminClient
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            app_role: role
          })
          .eq('id', newUser.user.id);

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError);
        }
      }
    }

    // Add to staff table (using service role client)
    const { error: staffError } = await adminClient
      .from('staff')
      .insert({
        user_id: newUser.user.id,
        org_id: currentStaff.org_id,
        role: role,
        is_active: true
      });

    if (staffError) {
      console.error('Error adding to staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to add staff member' },
        { status: 500 }
      );
    }

    // Create default permissions based on role (using service role client)
    const isAdmin = role === 'admin';
    const { error: permissionsError } = await adminClient
      .from('staff_permissions')
      .insert({
        staff_id: newUser.user.id,

        // Visibility
        exercises_visibility: isAdmin ? 'all' : 'own_and_admin',
        workouts_visibility: isAdmin ? 'all' : 'own_and_admin',
        routines_visibility: isAdmin ? 'all' : 'own_and_admin',
        plans_visibility: isAdmin ? 'all' : 'own_and_admin',
        athletes_visibility: isAdmin ? 'all' : 'assigned',
        groups_visibility: isAdmin ? 'all' : 'own',

        // Exercises
        can_create_exercises: true,
        can_edit_own_exercises: true,
        can_edit_admin_exercises: isAdmin,
        can_delete_own_exercises: isAdmin,
        can_delete_admin_exercises: false, // Configurable per admin

        // Workouts
        can_create_workouts: true,
        can_edit_own_workouts: true,
        can_edit_admin_workouts: isAdmin,
        can_delete_own_workouts: isAdmin,
        can_delete_admin_workouts: false,

        // Routines
        can_create_routines: true,
        can_edit_own_routines: true,
        can_edit_admin_routines: isAdmin,
        can_delete_own_routines: isAdmin,
        can_delete_admin_routines: false,

        // Plans
        can_create_plans: true,
        can_edit_own_plans: true,
        can_edit_admin_plans: isAdmin,
        can_delete_own_plans: isAdmin,
        can_delete_admin_plans: false,

        // Athletes
        can_assign_coaches: isAdmin,
        can_edit_athlete_profile: true,
        can_delete_athletes: isAdmin,

        // Staff
        can_view_staff: true,
        can_manage_staff: isAdmin,
        can_view_all_staff: isAdmin,
        can_assign_permissions: false, // Only super_admin

        // Groups
        can_view_groups: true,
        can_create_groups: true,
        can_edit_own_groups: true,
        can_edit_all_groups: isAdmin,
        can_delete_own_groups: isAdmin,
        can_delete_all_groups: false,
        can_assign_athletes_to_groups: true,

        // VALD
        can_sync_force_plates: isAdmin,
      });

    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        firstName,
        lastName
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
