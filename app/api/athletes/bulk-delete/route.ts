import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Only coaches, admins, and super_admins can delete athletes
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only coaches and admins can delete athletes.' },
        { status: 403 }
      );
    }

    const { athleteIds } = await request.json();

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: 'No athlete IDs provided' },
        { status: 400 }
      );
    }

    console.log(`🗑️  Starting bulk deletion for ${athleteIds.length} athletes`);

    // Tables to delete from (same order as single delete)
    const deletionSteps = [
      { table: 'set_logs', column: 'athlete_id' },
      { table: 'exercise_logs', column: 'athlete_id' },
      { table: 'workout_logs', column: 'athlete_id' },
      { table: 'workout_instances', column: 'athlete_id' },
      { table: 'plan_assignments', column: 'athlete_id' },
      { table: 'group_members', column: 'athlete_id' },
      { table: 'max_records', column: 'athlete_id' },
      { table: 'vald_profile_queue', column: 'athlete_id' },
      { table: 'relationships', column: 'athlete_id' },
      { table: 'athlete_tags', column: 'athlete_id' },
      { table: 'athlete_notes', column: 'athlete_id' },
      { table: 'athlete_documents', column: 'athlete_id' },
    ];

    let totalDeleted = 0;

    // Delete related records
    for (const step of deletionSteps) {
      const { error, count } = await supabase
        .from(step.table)
        .delete()
        .in(step.column, athleteIds);

      if (error) {
        console.log(`⚠️  Could not delete from ${step.table}: ${error.message}`);
      } else if (count) {
        totalDeleted += count;
        console.log(`✅ Deleted ${count} records from ${step.table}`);
      }
    }

    // Finally, delete the athlete records
    const { error: deleteAthletesError, count: athletesDeleted } = await supabase
      .from('athletes')
      .delete()
      .in('id', athleteIds);

    if (deleteAthletesError) {
      console.error('❌ Error deleting athletes:', deleteAthletesError);
      return NextResponse.json(
        { error: 'Failed to delete athletes: ' + deleteAthletesError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted ${athletesDeleted} athletes and ${totalDeleted} related records`);

    return NextResponse.json({
      success: true,
      deleted: athletesDeleted,
      relatedRecordsDeleted: totalDeleted,
    });

  } catch (error) {
    console.error('Unexpected error during bulk delete:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
