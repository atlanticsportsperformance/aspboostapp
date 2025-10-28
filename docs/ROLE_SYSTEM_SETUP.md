# Role-Based Access Control System

## Overview

A complete role-based authorization system for managing access across Admin, Coach, and Athlete user types.

## Roles

### Admin
- **Permissions:**
  - Full system access
  - Manage all users (create/edit/delete coaches & athletes)
  - View/edit all athlete data across all organizations
  - System settings and organization management
  - Delete data

### Coach
- **Permissions:**
  - View all athletes in their organization
  - Edit athlete data in their org
  - Create and manage workout programs
  - View performance metrics and reports
  - View other staff members
- **Restrictions:**
  - Cannot manage other coaches
  - Cannot access athletes outside their org
  - Cannot delete data

### Athlete
- **Permissions:**
  - View their own data (workouts, performance, records)
  - View their own force profile
- **Restrictions:**
  - Cannot edit force profile data
  - Cannot view other athletes
  - Cannot access staff/coach views

## Files Created

### 1. Authorization Utilities
**`lib/auth/roles.ts`**
- Core authorization functions
- Role hierarchy system
- Permission checkers:
  - `hasRole()` - Check exact role
  - `hasRoleOrHigher()` - Check role hierarchy
  - `isAdmin()` - Check if admin
  - `isCoachOrHigher()` - Check if coach or admin
  - `canViewAthlete()` - Check athlete view permission
  - `canEditAthlete()` - Check athlete edit permission
  - `canManageUsers()` - Check user management permission
  - `Permissions` object with all permissions

### 2. React Hook
**`lib/auth/use-user-role.ts`**
- `useUserRole()` hook to get current user with role
- Automatically fetches from Supabase auth + profiles table
- Returns: `{ user, loading }`

### 3. UI Components
**`components/auth/role-guard.tsx`**
- `<RoleGuard>` - Generic role-based content guard
- `<AdminOnly>` - Show content only to admins
- `<CoachOrHigher>` - Show content to coaches and admins
- `<AthleteOnly>` - Show content only to athletes

## Usage Examples

### In Components

```tsx
import { useUserRole } from '@/lib/auth/use-user-role';
import { isAdmin, canEditAthlete } from '@/lib/auth/roles';

function MyComponent() {
  const { user, loading } = useUserRole();

  if (loading) return <div>Loading...</div>;

  const canEdit = canEditAthlete(user, athleteId, athleteOrgId);

  return (
    <div>
      {isAdmin(user) && <button>Admin Action</button>}
      {canEdit && <button>Edit Athlete</button>}
    </div>
  );
}
```

### With Role Guards

```tsx
import { RoleGuard, AdminOnly, CoachOrHigher } from '@/components/auth/role-guard';

function Dashboard() {
  return (
    <div>
      {/* Show to coaches and admins */}
      <CoachOrHigher>
        <button>Create Workout</button>
      </CoachOrHigher>

      {/* Show only to admins */}
      <AdminOnly fallback={<p>Admin only</p>}>
        <button>Manage Users</button>
      </AdminOnly>

      {/* Custom role check */}
      <RoleGuard role="athlete" orHigher={false}>
        <p>Athlete-only content</p>
      </RoleGuard>
    </div>
  );
}
```

### In API Routes

```tsx
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin, canEditAthlete } from '@/lib/auth/roles';

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();

  // Get current user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, app_role, org_id')
    .eq('id', authUser.id)
    .single();

  // Check permissions
  if (!isAdmin(profile)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with admin action...
}
```

## Current Users in System

```
Admin:
- owner@elitebaseball.com (Mike Johnson)
- admin@elitebaseball.com (Sarah Williams)

Coach:
- coach1@elitebaseball.com (Tom Martinez)
- coach2@elitebaseball.com (Lisa Anderson)

Athlete:
- athlete1@elitebaseball.com (Jake Thompson)
- athlete2@elitebaseball.com (Emma Davis)
- stblewett7@gmail.com (Scott Blewett)
- cxm1970131@gmail.com (Colin Ma)
```

## Next Steps

1. **Update Existing Pages**
   - Add role guards to dashboard pages
   - Hide/show features based on role
   - Add permission checks to data mutations

2. **Create Role-Specific Dashboards**
   - Admin dashboard (user management, system stats)
   - Coach dashboard (athlete list, workout management)
   - Athlete dashboard (personal performance view)

3. **Add Row-Level Security (RLS)**
   - Add Supabase RLS policies for each table
   - Ensure database-level security matches app-level

4. **Testing**
   - Test each role's access permissions
   - Verify org_id filtering works correctly
   - Test edge cases (athlete viewing other athletes, etc.)

## Database Schema

**profiles table:**
- `id` - UUID (matches auth.users.id)
- `email` - Text
- `app_role` - Text ('admin' | 'coach' | 'athlete')
- `org_id` - UUID (organization)
- Other fields...

**staff table:**
- `user_id` - UUID (references profiles.id)
- `role` - Text ('owner' | 'admin' | 'coach')
- `org_id` - UUID
- Other fields...

**athletes table:**
- `user_id` - UUID (references profiles.id)
- `org_id` - UUID
- Other fields...
