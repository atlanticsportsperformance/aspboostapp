import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins and super_admins can delete staff
    if (!['admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can delete staff.' },
        { status: 403 }
      );
    }

    // Await params before accessing properties
    const { id: staffId } = await params;

    // Verify staff exists and get user_id if linked to auth
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, user_id, org_id')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️  Starting deletion process for staff: ${staff.first_name} ${staff.last_name} (${staffId})`);

    // Delete all related records in the correct order (child tables first)
    const deletionSteps = [
      // 1. Coach-athlete assignments
      { table: 'coach_athletes', column: 'coach_id', description: 'coach assignments' },

      // 2. Staff permissions (if exists)
      { table: 'staff_permissions', column: 'staff_id', description: 'staff permissions' },

      // 3. Activity logs (if tracked by staff)
      { table: 'activity_logs', column: 'staff_id', description: 'activity logs' },
    ];

    // Execute deletions
    for (const step of deletionSteps) {
      const { error, count } = await supabase
        .from(step.table)
        .delete()
        .eq(step.column, staffId);

      if (error) {
        // Log error but continue (table might not exist or have no records)
        console.log(`⚠️  Could not delete ${step.description}: ${error.message}`);
      } else {
        console.log(`✅ Deleted ${count || 0} ${step.description}`);
      }
    }

    // Finally, delete the staff record itself
    const { error: deleteStaffError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (deleteStaffError) {
      console.error('❌ Error deleting staff:', deleteStaffError);
      return NextResponse.json(
        { error: 'Failed to delete staff: ' + deleteStaffError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted staff: ${staff.first_name} ${staff.last_name}`);

    // Delete auth user if exists
    if (staff.user_id) {
      try {
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

        // Delete from profiles table FIRST (must come before auth user deletion)
        const { error: profileDeleteError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', staff.user_id);

        if (profileDeleteError) {
          console.error('⚠️  Error deleting profile:', profileDeleteError);
        } else {
          console.log(`✅ Deleted profile for: ${staff.user_id}`);
        }

        // Then delete the auth user
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(staff.user_id);

        if (deleteAuthError) {
          console.error('⚠️  Error deleting auth user:', deleteAuthError);
        } else {
          console.log(`✅ Deleted auth user: ${staff.user_id}`);
        }
      } catch (authDeleteError) {
        // Log but don't fail the request - staff is already deleted
        console.error('⚠️  Error during auth cleanup:', authDeleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted staff member: ${staff.first_name} ${staff.last_name}${staff.user_id ? ' and login account' : ''}`,
      staffId: staffId,
    });

  } catch (error) {
    console.error('Unexpected error deleting staff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
