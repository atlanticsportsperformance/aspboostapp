import { createClient } from '@/lib/supabase/client';

/**
 * Detaches a workout instance from group sync
 * Call this when an athlete makes changes to a group-synced workout
 */
export async function detachWorkoutInstanceFromGroup(
  instanceId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get current user if not provided
    let detachedBy = userId;
    if (!detachedBy) {
      const { data: { user } } = await supabase.auth.getUser();
      detachedBy = user?.id;
    }

    // Update the instance to mark it as detached
    const { error } = await supabase
      .from('workout_instances')
      .update({
        is_synced_with_group: false,
        detached_at: new Date().toISOString(),
        detached_by: detachedBy
      })
      .eq('id', instanceId)
      .eq('is_synced_with_group', true); // Only update if currently synced

    if (error) {
      console.error('Error detaching instance from group:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Workout instance detached from group sync:', instanceId);
    return { success: true };
  } catch (err: any) {
    console.error('Exception detaching instance:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if a workout instance is synced with a group
 */
export async function isInstanceSyncedWithGroup(
  instanceId: string
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('workout_instances')
    .select('is_synced_with_group, source_type')
    .eq('id', instanceId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.source_type === 'group' && data.is_synced_with_group === true;
}

/**
 * Get group information for a synced workout instance
 */
export async function getGroupInfoForInstance(
  instanceId: string
): Promise<{ groupId: string; groupName: string; color: string } | null> {
  const supabase = createClient();

  const { data: instance, error } = await supabase
    .from('workout_instances')
    .select('source_type, source_id, is_synced_with_group')
    .eq('id', instanceId)
    .single();

  if (error || !instance || instance.source_type !== 'group' || !instance.source_id) {
    return null;
  }

  // Get group info from schedule
  const { data: schedule } = await supabase
    .from('group_workout_schedules')
    .select(`
      group_id,
      groups:group_id (
        id,
        name,
        color
      )
    `)
    .eq('id', instance.source_id)
    .single();

  if (!schedule?.groups) {
    return null;
  }

  return {
    groupId: schedule.groups.id,
    groupName: schedule.groups.name,
    color: schedule.groups.color
  };
}
