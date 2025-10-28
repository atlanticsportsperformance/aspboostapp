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

    // Only super_admin can delete auth users
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.app_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete auth users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      );
    }

    // Create admin client
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

    let userIdToDelete = userId;

    // If email provided, find the user ID
    if (email && !userId) {
      const { data: users } = await adminClient.auth.admin.listUsers();
      const userToDelete = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!userToDelete) {
        return NextResponse.json(
          { error: `No auth user found with email: ${email}` },
          { status: 404 }
        );
      }

      userIdToDelete = userToDelete.id;
    }

    console.log(`🗑️  Starting deletion for user: ${userIdToDelete}`);

    // Try to use the database function if it exists
    console.log('Attempting to use delete_auth_user_cascade function...');
    const { data: functionResult, error: functionError } = await adminClient
      .rpc('delete_auth_user_cascade', {
        user_id_to_delete: userIdToDelete
      });

    if (!functionError && functionResult?.success) {
      console.log('✅ User deleted via database function');
      console.log('Deleted from tables:', functionResult.deleted_from_tables);
      return NextResponse.json({
        success: true,
        message: 'Auth user deleted successfully via database function',
        deletedUserId: userIdToDelete,
        deletedFrom: functionResult.deleted_from_tables
      });
    }

    // If function doesn't exist or failed, fall back to manual deletion
    console.log('Database function not available or failed, using manual deletion...');
    console.log('Function error:', functionError?.message);

    // Manual cascade deletion
    const deletionSteps = [];

    // Step 1: Delete athletes
    const { error: athleteError } = await adminClient
      .from('athletes')
      .delete()
      .eq('user_id', userIdToDelete);
    if (!athleteError) deletionSteps.push('athletes');

    // Step 2: Delete staff
    const { error: staffError } = await adminClient
      .from('staff')
      .delete()
      .eq('user_id', userIdToDelete);
    if (!staffError) deletionSteps.push('staff');

    // Step 3: Delete coach_athletes
    const { error: coachAthleteError } = await adminClient
      .from('coach_athletes')
      .delete()
      .eq('coach_id', userIdToDelete);
    if (!coachAthleteError) deletionSteps.push('coach_athletes');

    // Step 4: Delete profile
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userIdToDelete);

    if (profileDeleteError) {
      console.error('⚠️  Error deleting profile:', profileDeleteError);
    } else {
      console.log('✅ Profile deleted');
      deletionSteps.push('profiles');
    }

    // Step 5: Try to delete the auth user
    console.log('Attempting to delete auth user...');
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      userIdToDelete,
      false // shouldSoftDelete = false (hard delete)
    );

    if (deleteError) {
      console.error('❌ Error deleting auth user:', deleteError);
      console.error('Error details:', JSON.stringify(deleteError, null, 2));
      return NextResponse.json(
        {
          error: `Deleted dependencies (${deletionSteps.join(', ')}) but failed to delete auth user: ${deleteError.message}. You need to create the delete_auth_user_cascade database function. See scripts/create-delete-auth-user-function.sql`,
          partialSuccess: true,
          deletedDependencies: deletionSteps
        },
        { status: 500 }
      );
    }

    console.log('✅ Auth user deleted successfully');
    deletionSteps.push('auth.users');

    return NextResponse.json({
      success: true,
      message: 'Auth user deleted successfully',
      deletedUserId: userIdToDelete
    });

  } catch (error) {
    console.error('Unexpected error deleting auth user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
