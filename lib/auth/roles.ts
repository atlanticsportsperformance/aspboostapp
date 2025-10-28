/**
 * Role-based authorization utilities
 */

export type AppRole = 'admin' | 'coach' | 'athlete';

export interface UserWithRole {
  id: string;
  email: string;
  app_role: AppRole;
  org_id?: string;
}

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 3,
  coach: 2,
  athlete: 1,
};

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserWithRole | null, role: AppRole): boolean {
  if (!user) return false;
  return user.app_role === role;
}

/**
 * Check if user has role with equal or higher permissions
 */
export function hasRoleOrHigher(user: UserWithRole | null, role: AppRole): boolean {
  if (!user || !user.app_role) return false;
  return ROLE_HIERARCHY[user.app_role] >= ROLE_HIERARCHY[role];
}

/**
 * Check if user is admin
 */
export function isAdmin(user: UserWithRole | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user is coach or higher
 */
export function isCoachOrHigher(user: UserWithRole | null): boolean {
  return hasRoleOrHigher(user, 'coach');
}

/**
 * Check if user is athlete
 */
export function isAthlete(user: UserWithRole | null): boolean {
  return hasRole(user, 'athlete');
}

/**
 * Check if user can view athlete data
 * - Admins: can view all athletes
 * - Coaches: can view athletes in their org
 * - Athletes: can only view their own data
 */
export function canViewAthlete(
  user: UserWithRole | null,
  athleteId: string,
  athleteOrgId?: string
): boolean {
  if (!user) return false;

  // Admins can view all
  if (isAdmin(user)) return true;

  // Coaches can view athletes in their org
  if (hasRole(user, 'coach')) {
    return user.org_id === athleteOrgId;
  }

  // Athletes can only view themselves
  if (isAthlete(user)) {
    return user.id === athleteId;
  }

  return false;
}

/**
 * Check if user can edit athlete data
 * - Admins: can edit all athletes
 * - Coaches: can edit athletes in their org
 * - Athletes: cannot edit athlete data
 */
export function canEditAthlete(
  user: UserWithRole | null,
  athleteId: string,
  athleteOrgId?: string
): boolean {
  if (!user) return false;

  // Athletes cannot edit
  if (isAthlete(user)) return false;

  // Admins can edit all
  if (isAdmin(user)) return true;

  // Coaches can edit athletes in their org
  return user.org_id === athleteOrgId;
}

/**
 * Check if user can manage users (create/edit/delete)
 * Only admins can manage users
 */
export function canManageUsers(user: UserWithRole | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view staff/coaches
 * Only admins and coaches can view staff list
 */
export function canViewStaff(user: UserWithRole | null): boolean {
  return isCoachOrHigher(user);
}

/**
 * Get accessible athlete IDs for a user
 * - Admins: all athletes
 * - Coaches: athletes in their org
 * - Athletes: only themselves
 */
export function getAccessibleAthleteFilter(user: UserWithRole | null):
  | { all: true }
  | { org_id: string }
  | { id: string }
  | null {
  if (!user) return null;

  if (isAdmin(user)) {
    return { all: true };
  }

  if (hasRole(user, 'coach') && user.org_id) {
    return { org_id: user.org_id };
  }

  if (isAthlete(user)) {
    return { id: user.id };
  }

  return null;
}

/**
 * Permission constants for easy reference
 */
export const Permissions = {
  // Athlete permissions
  VIEW_OWN_DATA: (user: UserWithRole | null) => !!user,
  VIEW_OWN_WORKOUTS: (user: UserWithRole | null) => !!user,

  // Coach permissions
  VIEW_ALL_ATHLETES: (user: UserWithRole | null) => isCoachOrHigher(user),
  EDIT_ATHLETE_DATA: (user: UserWithRole | null) => isCoachOrHigher(user),
  CREATE_WORKOUTS: (user: UserWithRole | null) => isCoachOrHigher(user),
  VIEW_STAFF: (user: UserWithRole | null) => isCoachOrHigher(user),

  // Admin permissions
  MANAGE_USERS: (user: UserWithRole | null) => isAdmin(user),
  MANAGE_ORG: (user: UserWithRole | null) => isAdmin(user),
  SYSTEM_SETTINGS: (user: UserWithRole | null) => isAdmin(user),
  DELETE_DATA: (user: UserWithRole | null) => isAdmin(user),
} as const;
