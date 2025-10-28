import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
    const { athleteId, email, firstName, lastName, password } = body;

    if (!athleteId || !email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: 'Athlete ID, email, first name, last name, and password are required' },
        { status: 400 }
      );
    }

    // Verify athlete exists and doesn't already have a login
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, user_id, email')
      .eq('id', athleteId)
      .single();

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    if (athlete.user_id) {
      return NextResponse.json(
        { error: 'This athlete already has a login account' },
        { status: 409 }
      );
    }

    // Create admin client for auth operations
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

    // Check if email already exists in auth
    const { data: existingAuthUser } = await adminClient.auth.admin.listUsers();
    const emailExists = existingAuthUser.users.some(u => u.email === email);

    if (emailExists) {
      return NextResponse.json(
        { error: `An auth account with email "${email}" already exists` },
        { status: 409 }
      );
    }

    // Create the auth user
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating auth user:', createUserError);
      return NextResponse.json(
        { error: `Failed to create auth account: ${createUserError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Create profile with athlete role
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        app_role: 'athlete',
      });

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      console.error('Error creating profile:', profileError);
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Link athlete to auth user
    const { error: updateError } = await supabase
      .from('athletes')
      .update({ user_id: newUser.user.id })
      .eq('id', athleteId);

    if (updateError) {
      // Rollback: delete auth user and profile
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      console.error('Error linking athlete to user:', updateError);
      return NextResponse.json(
        { error: `Failed to link athlete: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      message: 'Login account created successfully'
    });

  } catch (error) {
    console.error('Unexpected error creating login account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
