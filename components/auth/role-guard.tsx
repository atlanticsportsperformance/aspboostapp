/**
 * Component to guard content based on user role
 * Usage:
 *   <RoleGuard role="admin">Admin only content</RoleGuard>
 *   <RoleGuard role="coach" fallback={<div>Access denied</div>}>Coach content</RoleGuard>
 */

'use client';

import { useUserRole } from '@/lib/auth/use-user-role';
import { hasRole, hasRoleOrHigher, type AppRole } from '@/lib/auth/roles';
import { ReactNode } from 'react';

interface RoleGuardProps {
  /** Required role to view content */
  role: AppRole;
  /** If true, allows equal or higher roles (default: true) */
  orHigher?: boolean;
  /** Content to show when user doesn't have permission */
  fallback?: ReactNode;
  /** Content to show while loading */
  loading?: ReactNode;
  /** Children to render if user has permission */
  children: ReactNode;
}

export function RoleGuard({
  role,
  orHigher = true,
  fallback = null,
  loading = null,
  children,
}: RoleGuardProps) {
  const { user, loading: isLoading } = useUserRole();

  if (isLoading) {
    return <>{loading}</>;
  }

  const hasPermission = orHigher
    ? hasRoleOrHigher(user, role)
    : hasRole(user, role);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Specific role guards for convenience
 */
export function AdminOnly({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RoleGuard role="admin" orHigher={false} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function CoachOrHigher({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RoleGuard role="coach" orHigher={true} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function AthleteOnly({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RoleGuard role="athlete" orHigher={false} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
