import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only coaches, admins, and super_admins can delete athletes
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only coaches and admins can delete athletes.' },
        { status: 403 }
      );
    }

    const athleteId = params.id;

    // Verify athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, vald_profile_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️  Starting deletion process for athlete: ${athlete.first_name} ${athlete.last_name} (${athleteId})`);

    // Delete all related records in the correct order (child tables first)
    // NOTE: We preserve percentile contributions to maintain data integrity
    const deletionSteps = [
      // 1. Workout execution data
      { table: 'set_logs', column: 'athlete_id', description: 'set logs' },
      { table: 'exercise_logs', column: 'athlete_id', description: 'exercise logs' },
      { table: 'workout_logs', column: 'athlete_id', description: 'workout logs' },

      // 2. Workout instances and assignments
      { table: 'workout_instances', column: 'athlete_id', description: 'workout instances' },

      // 3. Plan assignments
      { table: 'plan_assignments', column: 'athlete_id', description: 'plan assignments' },

      // 4. Group memberships
      { table: 'group_members', column: 'athlete_id', description: 'group memberships' },

      // 5. Max records
      { table: 'max_records', column: 'athlete_id', description: 'max records' },

      // 6. VALD data (if exists)
      { table: 'vald_profile_queue', column: 'athlete_id', description: 'VALD queue entries' },

      // 7. Relationships (if using contacts table)
      { table: 'relationships', column: 'athlete_id', description: 'relationships' },

      // 8. Tags
      { table: 'athlete_tags', column: 'athlete_id', description: 'athlete tags' },

      // 9. Notes/Documents
      { table: 'athlete_notes', column: 'athlete_id', description: 'athlete notes' },
      { table: 'athlete_documents', column: 'athlete_id', description: 'athlete documents' },

      // NOTE: athlete_percentile_contributions is PRESERVED for data integrity
      // This keeps the athlete's test data in the percentile calculation pool
    ];

    // Execute deletions
    for (const step of deletionSteps) {
      const { error, count } = await supabase
        .from(step.table)
        .delete()
        .eq(step.column, athleteId);

      if (error) {
        // Log error but continue (table might not exist or have no records)
        console.log(`⚠️  Could not delete ${step.description}: ${error.message}`);
      } else {
        console.log(`✅ Deleted ${count || 0} ${step.description}`);
      }
    }

    // Finally, delete the athlete record itself
    const { error: deleteAthleteError } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athleteId);

    if (deleteAthleteError) {
      console.error('❌ Error deleting athlete:', deleteAthleteError);
      return NextResponse.json(
        { error: 'Failed to delete athlete: ' + deleteAthleteError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted athlete: ${athlete.first_name} ${athlete.last_name}`);

    // Note: We don't delete from VALD API as that would remove historical test data
    // The VALD profile remains in VALD system for data integrity

    return NextResponse.json({
      success: true,
      message: `Successfully deleted athlete: ${athlete.first_name} ${athlete.last_name}`,
      athleteId: athleteId,
    });

  } catch (error) {
    console.error('Unexpected error deleting athlete:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
