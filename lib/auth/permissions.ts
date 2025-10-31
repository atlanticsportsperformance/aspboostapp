import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ContentVisibility = 'own' | 'own_and_admin' | 'all';
export type AthleteVisibility = 'assigned' | 'all';
export type GroupsVisibility = 'own' | 'assigned' | 'all';

export interface StaffPermissions {
  staff_id: string;
  // Content visibility
  exercises_visibility: ContentVisibility;
  workouts_visibility: ContentVisibility;
  routines_visibility: ContentVisibility;
  plans_visibility?: ContentVisibility;
  athletes_visibility: AthleteVisibility;
  // Exercise permissions
  can_create_exercises: boolean;
  can_edit_own_exercises: boolean;
  can_edit_admin_exercises: boolean;
  can_delete_own_exercises: boolean;
  can_delete_admin_exercises?: boolean;
  // Workout permissions
  can_create_workouts: boolean;
  can_edit_own_workouts: boolean;
  can_edit_admin_workouts: boolean;
  can_delete_own_workouts: boolean;
  can_delete_admin_workouts?: boolean;
  // Routine permissions
  can_create_routines: boolean;
  can_edit_own_routines: boolean;
  can_edit_admin_routines: boolean;
  can_delete_own_routines: boolean;
  can_delete_admin_routines?: boolean;
  // Plans permissions
  can_create_plans?: boolean;
  can_edit_own_plans?: boolean;
  can_edit_admin_plans?: boolean;
  can_delete_own_plans?: boolean;
  can_delete_admin_plans?: boolean;
  // Phase 3A: Staff management permissions
  can_view_staff?: boolean;
  can_manage_staff?: boolean;
  can_view_all_staff?: boolean;
  can_assign_permissions?: boolean;
  // Phase 3B: Groups management permissions
  can_view_groups?: boolean;
  can_create_groups?: boolean;
  can_edit_own_groups?: boolean;
  can_edit_all_groups?: boolean;
  can_delete_own_groups?: boolean;
  can_delete_all_groups?: boolean;
  can_assign_athletes_to_groups?: boolean;
  groups_visibility?: GroupsVisibility;
  // VALD Integration
  can_sync_force_plates?: boolean;
  // Tag-based filtering (optional additional restriction on exercises)
  allowed_exercise_tags?: string[] | null;
}

export interface UserWithRole {
  id: string;
  email: string;
  app_role: 'super_admin' | 'admin' | 'coach' | 'athlete';
  org_id?: string;
}

// ============================================================================
// FETCH PERMISSIONS
// ============================================================================

/**
 * Get staff permissions for a specific staff member
 */
export async function getStaffPermissions(staffId: string): Promise<StaffPermissions | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('staff_permissions')
    .select('*')
    .eq('staff_id', staffId)
    .single();

  if (error) {
    console.error('Error fetching staff permissions:', error);
    return null;
  }

  return data;
}

/**
 * Get assigned athlete IDs for a coach
 */
export async function getCoachAthleteIds(coachId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', coachId);

  if (error) {
    console.error('Error fetching coach athletes:', error);
    return [];
  }

  return data.map(row => row.athlete_id);
}

// ============================================================================
// PERMISSION CHECKS - CONTENT VISIBILITY
// ============================================================================

/**
 * Check if user can view specific content based on visibility settings
 *
 * @param workoutInstanceId - Optional: If provided and content is from a group workout, bypasses permission checks
 */
export async function canViewContent(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  contentType: 'exercises' | 'workouts' | 'routines',
  contentCreatorId: string | null,
  workoutInstanceId?: string
): Promise<boolean> {
  // Super admins can view everything - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't access content management
  if (userRole === 'athlete') return false;

  // If this is a workout from a group schedule, allow staff to view it
  // (group workouts should always be visible to staff viewing athlete calendars)
  if (contentType === 'workouts' && workoutInstanceId) {
    const supabase = createClient();
    const { data: instance } = await supabase
      .from('workout_instances')
      .select('source_type')
      .eq('id', workoutInstanceId)
      .single();

    if (instance?.source_type === 'group') {
      return true; // Bypass permissions for group-synced workouts
    }
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  const visibilityField = `${contentType}_visibility` as keyof Pick<StaffPermissions, 'exercises_visibility' | 'workouts_visibility' | 'routines_visibility'>;
  const visibility = permissions[visibilityField] as ContentVisibility;

  switch (visibility) {
    case 'all':
      return true;
    case 'own_and_admin':
      // Can view their own content + admin-created content + super_admin-created content
      if (!contentCreatorId) return true; // No creator = old content, show it
      if (contentCreatorId === userId) return true; // Their own content
      // Check if creator is admin or super_admin
      const supabase = createClient();
      const { data: creator } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', contentCreatorId)
        .single();
      return creator?.app_role === 'admin' || creator?.app_role === 'super_admin';
    case 'own':
      // Can only view their own content
      return !contentCreatorId || contentCreatorId === userId;
    default:
      return false;
  }
}

/**
 * Check if user can view a specific athlete
 */
export async function canViewAthlete(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  athleteId: string
): Promise<boolean> {
  // Super admins can view all athletes - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can only view themselves
  if (userRole === 'athlete') {
    // TODO: Check if userId maps to this athleteId
    return false;
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  if (permissions.athletes_visibility === 'all') {
    return true;
  } else {
    // Check if athlete is assigned to this coach
    const assignedIds = await getCoachAthleteIds(userId);
    return assignedIds.includes(athleteId);
  }
}

/**
 * Check if a workout instance is from a group schedule
 * Helper function to determine if group workout permissions should apply
 */
export async function isGroupWorkout(workoutInstanceId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: instance } = await supabase
    .from('workout_instances')
    .select('source_type')
    .eq('id', workoutInstanceId)
    .single();

  return instance?.source_type === 'group';
}

// ============================================================================
// PERMISSION CHECKS - FEATURE PERMISSIONS
// ============================================================================

/**
 * Check if user can create content of a specific type
 */
export async function canCreateContent(
  userId: string,
  userRole: 'admin' | 'coach' | 'athlete' | 'super_admin',
  contentType: 'exercises' | 'workouts' | 'routines'
): Promise<boolean> {
  // Super admins can do everything - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't create content
  if (userRole === 'athlete') return false;

  // Check staff permissions for admins and coaches
  const permissions = await getStaffPermissions(userId);
  if (!permissions) {
    // If no permissions record exists, default to false for safety
    return false;
  }

  const permissionField = `can_create_${contentType}` as keyof Pick<StaffPermissions, 'can_create_exercises' | 'can_create_workouts' | 'can_create_routines'>;
  return permissions[permissionField] as boolean;
}

/**
 * Check if user can edit specific content
 *
 * @param workoutInstanceId - Optional: If provided and content is from a group workout, allows editing after unlink
 */
export async function canEditContent(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  contentType: 'exercises' | 'workouts' | 'routines',
  contentCreatorId: string | null,
  workoutInstanceId?: string
): Promise<boolean> {
  // Super admins can edit everything - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't edit content
  if (userRole === 'athlete') return false;

  // If this is a workout from a group schedule, staff can edit it
  // (editing will automatically unlink it from the group)
  if (contentType === 'workouts' && workoutInstanceId) {
    const isGroup = await isGroupWorkout(workoutInstanceId);
    if (isGroup) {
      return true; // Allow editing group workouts (will trigger unlink warning)
    }
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  // Check if it's their own content
  const isOwnContent = !contentCreatorId || contentCreatorId === userId;

  if (isOwnContent) {
    const ownPermissionField = `can_edit_own_${contentType}` as keyof Pick<StaffPermissions, 'can_edit_own_exercises' | 'can_edit_own_workouts' | 'can_edit_own_routines'>;
    return permissions[ownPermissionField] as boolean;
  } else {
    // Check if creator is admin or super_admin
    const supabase = createClient();
    const { data: creator } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', contentCreatorId)
      .single();

    const isAdminContent = creator?.app_role === 'admin' || creator?.app_role === 'super_admin';

    if (isAdminContent) {
      const adminPermissionField = `can_edit_admin_${contentType}` as keyof Pick<StaffPermissions, 'can_edit_admin_exercises' | 'can_edit_admin_workouts' | 'can_edit_admin_routines'>;
      return permissions[adminPermissionField] as boolean;
    } else {
      // Can't edit other coaches' content
      return false;
    }
  }
}

/**
 * Check if user can delete specific content
 */
export async function canDeleteContent(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  contentType: 'exercises' | 'workouts' | 'routines',
  contentCreatorId: string | null
): Promise<boolean> {
  // Super admins can delete everything - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't delete content
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  // Check if it's their own content
  const isOwnContent = !contentCreatorId || contentCreatorId === userId;

  if (isOwnContent) {
    const ownPermissionField = `can_delete_own_${contentType}` as keyof Pick<StaffPermissions, 'can_delete_own_exercises' | 'can_delete_own_workouts' | 'can_delete_own_routines'>;
    return permissions[ownPermissionField] as boolean;
  } else {
    // Check if creator is admin or super_admin
    const supabase = createClient();
    const { data: creator } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', contentCreatorId)
      .single();

    const isAdminContent = creator?.app_role === 'admin' || creator?.app_role === 'super_admin';

    if (isAdminContent) {
      const adminPermissionField = `can_delete_admin_${contentType}` as keyof Pick<StaffPermissions, 'can_delete_admin_exercises' | 'can_delete_admin_workouts' | 'can_delete_admin_routines'>;
      return permissions[adminPermissionField] as boolean;
    } else {
      // Can't delete other coaches' content
      return false;
    }
  }
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * Get content filter for queries based on user permissions
 * Returns array of creator IDs that the user can see
 */
export async function getContentFilter(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  contentType: 'exercises' | 'workouts' | 'routines' | 'plans'
): Promise<{ filter: 'all' | 'ids', creatorIds?: string[] }> {
  // Super admins see everything - bypass permissions
  if (userRole === 'super_admin') {
    return { filter: 'all' };
  }

  // Athletes see nothing
  if (userRole === 'athlete') {
    return { filter: 'ids', creatorIds: [] };
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) {
    return { filter: 'ids', creatorIds: [] };
  }

  const visibilityField = `${contentType}_visibility` as keyof Pick<StaffPermissions, 'exercises_visibility' | 'workouts_visibility' | 'routines_visibility' | 'plans_visibility'>;
  const visibility = permissions[visibilityField] as ContentVisibility;

  switch (visibility) {
    case 'all':
      return { filter: 'all' };

    case 'own_and_admin':
      // Get all admin and super_admin IDs
      const supabase = createClient();
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('app_role', ['admin', 'super_admin']);

      const adminIds = admins?.map(a => a.id) || [];
      return { filter: 'ids', creatorIds: [...adminIds, userId] };

    case 'own':
      return { filter: 'ids', creatorIds: [userId] };

    default:
      return { filter: 'ids', creatorIds: [] };
  }
}

/**
 * Get athlete filter for queries based on user permissions
 * Returns array of athlete IDs that the user can see
 */
export async function getAthleteFilter(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<{ filter: 'all' | 'ids', athleteIds?: string[] }> {
  // Super admins see all athletes - bypass permissions
  if (userRole === 'super_admin') {
    return { filter: 'all' };
  }

  // Athletes see only themselves (TODO: implement)
  if (userRole === 'athlete') {
    return { filter: 'ids', athleteIds: [] };
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) {
    return { filter: 'ids', athleteIds: [] };
  }

  if (permissions.athletes_visibility === 'all') {
    return { filter: 'all' };
  } else {
    const assignedIds = await getCoachAthleteIds(userId);
    return { filter: 'ids', athleteIds: assignedIds };
  }
}

// ============================================================================
// PHASE 3: STAFF & GROUPS PERMISSIONS
// ============================================================================

/**
 * Check if user can view staff members
 */
export async function canViewStaff(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<boolean> {
  // Super admins can view all staff - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't view staff
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  return permissions.can_view_staff ?? true; // Default to true for backwards compatibility
}

/**
 * Check if user can manage staff (add/edit/delete)
 */
export async function canManageStaff(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<boolean> {
  // Super admins can manage all staff - bypass permissions
  if (userRole === 'super_admin') return true;

  // Non-admins can't manage staff
  if (userRole !== 'admin') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  return permissions.can_manage_staff ?? false;
}

/**
 * Check if user can assign permissions to other staff
 */
export async function canAssignPermissions(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<boolean> {
  // Only super admins can assign permissions
  return userRole === 'super_admin';
}

/**
 * Check if user can view groups
 */
export async function canViewGroups(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<boolean> {
  // Super admins can view all groups - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't view groups
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  return permissions.can_view_groups ?? true;
}

/**
 * Check if user can create groups
 */
export async function canCreateGroups(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<boolean> {
  // Super admins can create groups - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't create groups
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  return permissions.can_create_groups ?? true;
}

/**
 * Check if user can edit a specific group
 */
export async function canEditGroup(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  groupCreatorId: string | null
): Promise<boolean> {
  // Super admins can edit all groups - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't edit groups
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  const isOwnGroup = !groupCreatorId || groupCreatorId === userId;

  if (permissions.can_edit_all_groups) {
    return true;
  } else if (isOwnGroup && permissions.can_edit_own_groups) {
    return true;
  }

  return false;
}

/**
 * Check if user can delete a specific group
 */
export async function canDeleteGroup(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete',
  groupCreatorId: string | null
): Promise<boolean> {
  // Super admins can delete all groups - bypass permissions
  if (userRole === 'super_admin') return true;

  // Athletes can't delete groups
  if (userRole === 'athlete') return false;

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) return false;

  const isOwnGroup = !groupCreatorId || groupCreatorId === userId;

  if (permissions.can_delete_all_groups) {
    return true;
  } else if (isOwnGroup && permissions.can_delete_own_groups) {
    return true;
  }

  return false;
}

/**
 * Get groups filter for queries based on user permissions
 */
export async function getGroupsFilter(
  userId: string,
  userRole: 'super_admin' | 'admin' | 'coach' | 'athlete'
): Promise<{ filter: 'all' | 'ids', groupIds?: string[] }> {
  // Super admins see all groups - bypass permissions
  if (userRole === 'super_admin') {
    return { filter: 'all' };
  }

  // Athletes see no groups
  if (userRole === 'athlete') {
    return { filter: 'ids', groupIds: [] };
  }

  // Get staff permissions
  const permissions = await getStaffPermissions(userId);
  if (!permissions) {
    return { filter: 'ids', groupIds: [] };
  }

  const visibility = permissions.groups_visibility ?? 'all';

  switch (visibility) {
    case 'all':
      return { filter: 'all' };

    case 'assigned':
      // Get groups assigned to this staff member
      const supabase = createClient();
      const { data: staffGroups } = await supabase
        .from('staff_groups')
        .select('group_id')
        .eq('staff_id', userId);

      const groupIds = staffGroups?.map(sg => sg.group_id) || [];
      return { filter: 'ids', groupIds };

    case 'own':
      // Get groups created by this user
      // Note: This requires groups table to have a created_by field
      return { filter: 'ids', groupIds: [] }; // TODO: Implement when groups have created_by

    default:
      return { filter: 'ids', groupIds: [] };
  }
}
