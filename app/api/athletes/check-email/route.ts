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

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create admin client to check auth users
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

    // Check if email exists in auth
    const { data: existingAuthUser } = await adminClient.auth.admin.listUsers();
    const authUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authUser) {
      // Email has an existing auth account
      console.log(`🔍 Found existing auth user: ${authUser.id} (${email})`);

      // Check if this user is a staff/admin/coach by checking profiles table
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('app_role, first_name, last_name')
        .eq('id', authUser.id)
        .single();

      if (userProfile) {
        console.log(`👤 User profile found - Role: ${userProfile.app_role}`);

        // Prevent creating athlete profiles for staff/admin/coach accounts
        if (userProfile.app_role && ['staff', 'coach', 'admin', 'super_admin'].includes(userProfile.app_role)) {
          return NextResponse.json({
            hasAuthAccount: true,
            isStaffAccount: true,
            staffRole: userProfile.app_role,
            staffName: `${userProfile.first_name} ${userProfile.last_name}`,
            message: `This email belongs to a ${userProfile.app_role} account (${userProfile.first_name} ${userProfile.last_name}). Staff accounts cannot be converted to athlete profiles.`,
            cannotCreateAthlete: true
          });
        }
      }

      // Check if it's already linked to an athlete
      const { data: existingAthlete } = await supabase
        .from('athletes')
        .select('id, first_name, last_name')
        .eq('user_id', authUser.id)
        .single();

      if (existingAthlete) {
        return NextResponse.json({
          hasAuthAccount: true,
          isLinkedToAthlete: true,
          athleteName: `${existingAthlete.first_name} ${existingAthlete.last_name}`,
          message: 'This email already has a login account and is linked to an athlete.',
          cannotCreateAthlete: true
        });
      } else {
        return NextResponse.json({
          hasAuthAccount: true,
          isLinkedToAthlete: false,
          message: 'This email already has a login account but is not linked to an athlete yet.'
        });
      }
    }

    // Check if email exists in athletes table (without auth account)
    const { data: athleteWithEmail } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, email')
      .eq('email', email)
      .single();

    if (athleteWithEmail) {
      return NextResponse.json({
        hasAuthAccount: false,
        isLinkedToAthlete: true,
        athleteName: `${athleteWithEmail.first_name} ${athleteWithEmail.last_name}`,
        message: `This email is already used by athlete: ${athleteWithEmail.first_name} ${athleteWithEmail.last_name}`,
        cannotCreateAthlete: true
      });
    }

    // No existing auth account or athlete
    return NextResponse.json({
      hasAuthAccount: false,
      message: 'No existing login account found for this email.'
    });

  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
