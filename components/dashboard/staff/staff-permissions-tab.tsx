'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import type { ContentVisibility, AthleteVisibility, GroupsVisibility } from '@/lib/auth/permissions';

interface StaffPermissionsTabProps {
  staff: {
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
      app_role: string;
    };
  };
}

export default function StaffPermissionsTab({ staff }: StaffPermissionsTabProps) {
  const { permissions: existingPermissions, loading } = useStaffPermissions(staff.user_id);
  const [saving, setSaving] = useState(false);

  // Permission states
  const [exercisesVisibility, setExercisesVisibility] = useState<ContentVisibility>('own_and_admin');
  const [workoutsVisibility, setWorkoutsVisibility] = useState<ContentVisibility>('own_and_admin');
  const [routinesVisibility, setRoutinesVisibility] = useState<ContentVisibility>('own_and_admin');
  const [plansVisibility, setPlansVisibility] = useState<ContentVisibility>('own_and_admin');
  const [athletesVisibility, setAthletesVisibility] = useState<AthleteVisibility>('all');

  // Exercise permissions
  const [canCreateExercises, setCanCreateExercises] = useState(true);
  const [canEditOwnExercises, setCanEditOwnExercises] = useState(true);
  const [canEditAdminExercises, setCanEditAdminExercises] = useState(false);
  const [canDeleteOwnExercises, setCanDeleteOwnExercises] = useState(false);
  const [canDeleteAdminExercises, setCanDeleteAdminExercises] = useState(false);

  // Workout permissions
  const [canCreateWorkouts, setCanCreateWorkouts] = useState(true);
  const [canEditOwnWorkouts, setCanEditOwnWorkouts] = useState(true);
  const [canEditAdminWorkouts, setCanEditAdminWorkouts] = useState(false);
  const [canDeleteOwnWorkouts, setCanDeleteOwnWorkouts] = useState(false);
  const [canDeleteAdminWorkouts, setCanDeleteAdminWorkouts] = useState(false);

  // Routine permissions
  const [canCreateRoutines, setCanCreateRoutines] = useState(true);
  const [canEditOwnRoutines, setCanEditOwnRoutines] = useState(true);
  const [canEditAdminRoutines, setCanEditAdminRoutines] = useState(false);
  const [canDeleteOwnRoutines, setCanDeleteOwnRoutines] = useState(false);
  const [canDeleteAdminRoutines, setCanDeleteAdminRoutines] = useState(false);

  // Plans permissions
  const [canCreatePlans, setCanCreatePlans] = useState(true);
  const [canEditOwnPlans, setCanEditOwnPlans] = useState(true);
  const [canEditAdminPlans, setCanEditAdminPlans] = useState(false);
  const [canDeleteOwnPlans, setCanDeleteOwnPlans] = useState(false);
  const [canDeleteAdminPlans, setCanDeleteAdminPlans] = useState(false);

  // Athlete permissions
  const [canAssignCoaches, setCanAssignCoaches] = useState(true);
  const [canEditAthleteProfile, setCanEditAthleteProfile] = useState(true);
  const [canDeleteAthletes, setCanDeleteAthletes] = useState(false);

  // Phase 3A: Staff permissions
  const [canViewStaff, setCanViewStaff] = useState(true);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [canViewAllStaff, setCanViewAllStaff] = useState(true);
  const [canAssignPermissions, setCanAssignPermissions] = useState(false);

  // Phase 3B: Groups permissions
  const [canViewGroups, setCanViewGroups] = useState(true);
  const [canCreateGroups, setCanCreateGroups] = useState(true);
  const [canEditOwnGroups, setCanEditOwnGroups] = useState(true);
  const [canEditAllGroups, setCanEditAllGroups] = useState(false);
  const [canDeleteOwnGroups, setCanDeleteOwnGroups] = useState(false);
  const [canDeleteAllGroups, setCanDeleteAllGroups] = useState(false);
  const [canAssignAthletesToGroups, setCanAssignAthletesToGroups] = useState(true);
  const [groupsVisibility, setGroupsVisibility] = useState<GroupsVisibility>('all');

  // VALD Force Plates
  const [canSyncForcePlates, setCanSyncForcePlates] = useState(false);

  // Tag-based exercise filtering
  const [allowedExerciseTags, setAllowedExerciseTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load available exercise tags
  useEffect(() => {
    async function loadTags() {
      const supabase = createClient();
      const { data } = await supabase
        .from('exercises')
        .select('tags')
        .eq('is_active', true)
        .not('tags', 'is', null);

      if (data) {
        const allTags = new Set<string>();
        data.forEach(ex => {
          if (ex.tags) {
            ex.tags.forEach((tag: string) => {
              // Filter out system tags
              if (!tag.startsWith('_')) {
                allTags.add(tag);
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    }
    loadTags();
  }, []);

  // Load existing permissions
  useEffect(() => {
    if (existingPermissions) {
      setExercisesVisibility(existingPermissions.exercises_visibility);
      setWorkoutsVisibility(existingPermissions.workouts_visibility);
      setRoutinesVisibility(existingPermissions.routines_visibility);
      setPlansVisibility(existingPermissions.plans_visibility ?? 'own_and_admin');
      setAthletesVisibility(existingPermissions.athletes_visibility);

      setCanCreateExercises(existingPermissions.can_create_exercises ?? true);
      setCanEditOwnExercises(existingPermissions.can_edit_own_exercises ?? true);
      setCanEditAdminExercises(existingPermissions.can_edit_admin_exercises ?? false);
      setCanDeleteOwnExercises(existingPermissions.can_delete_own_exercises ?? false);
      setCanDeleteAdminExercises(existingPermissions.can_delete_admin_exercises ?? false);

      setCanCreateWorkouts(existingPermissions.can_create_workouts ?? true);
      setCanEditOwnWorkouts(existingPermissions.can_edit_own_workouts ?? true);
      setCanEditAdminWorkouts(existingPermissions.can_edit_admin_workouts ?? false);
      setCanDeleteOwnWorkouts(existingPermissions.can_delete_own_workouts ?? false);
      setCanDeleteAdminWorkouts(existingPermissions.can_delete_admin_workouts ?? false);

      setCanCreateRoutines(existingPermissions.can_create_routines ?? true);
      setCanEditOwnRoutines(existingPermissions.can_edit_own_routines ?? true);
      setCanEditAdminRoutines(existingPermissions.can_edit_admin_routines ?? false);
      setCanDeleteOwnRoutines(existingPermissions.can_delete_own_routines ?? false);
      setCanDeleteAdminRoutines(existingPermissions.can_delete_admin_routines ?? false);

      // Plans permissions
      setCanCreatePlans(existingPermissions.can_create_plans ?? true);
      setCanEditOwnPlans(existingPermissions.can_edit_own_plans ?? true);
      setCanEditAdminPlans(existingPermissions.can_edit_admin_plans ?? false);
      setCanDeleteOwnPlans(existingPermissions.can_delete_own_plans ?? false);
      setCanDeleteAdminPlans(existingPermissions.can_delete_admin_plans ?? false);

      // Athlete permissions
      setCanAssignCoaches(existingPermissions.can_assign_coaches ?? true);
      setCanEditAthleteProfile(existingPermissions.can_edit_athlete_profile ?? true);
      setCanDeleteAthletes(existingPermissions.can_delete_athletes ?? false);

      // Phase 3A: Staff permissions
      setCanViewStaff(existingPermissions.can_view_staff ?? true);
      setCanManageStaff(existingPermissions.can_manage_staff ?? false);
      setCanViewAllStaff(existingPermissions.can_view_all_staff ?? true);
      setCanAssignPermissions(existingPermissions.can_assign_permissions ?? false);

      // Phase 3B: Groups permissions
      setCanViewGroups(existingPermissions.can_view_groups ?? true);
      setCanCreateGroups(existingPermissions.can_create_groups ?? true);
      setCanEditOwnGroups(existingPermissions.can_edit_own_groups ?? true);
      setCanEditAllGroups(existingPermissions.can_edit_all_groups ?? false);
      setCanDeleteOwnGroups(existingPermissions.can_delete_own_groups ?? false);
      setCanDeleteAllGroups(existingPermissions.can_delete_all_groups ?? false);
      setCanAssignAthletesToGroups(existingPermissions.can_assign_athletes_to_groups ?? true);
      if (existingPermissions.groups_visibility) {
        setGroupsVisibility(existingPermissions.groups_visibility);
      }

      // VALD Force Plates
      setCanSyncForcePlates(existingPermissions.can_sync_force_plates ?? false);

      // Tag-based exercise filtering
      setAllowedExerciseTags(existingPermissions.allowed_exercise_tags ?? []);
    }
  }, [existingPermissions]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const permissionsData = {
      staff_id: staff.user_id,
      exercises_visibility: exercisesVisibility,
      workouts_visibility: workoutsVisibility,
      routines_visibility: routinesVisibility,
      plans_visibility: plansVisibility,
      athletes_visibility: athletesVisibility,
      can_create_exercises: canCreateExercises,
      can_edit_own_exercises: canEditOwnExercises,
      can_edit_admin_exercises: canEditAdminExercises,
      can_delete_own_exercises: canDeleteOwnExercises,
      can_delete_admin_exercises: canDeleteAdminExercises,
      can_create_workouts: canCreateWorkouts,
      can_edit_own_workouts: canEditOwnWorkouts,
      can_edit_admin_workouts: canEditAdminWorkouts,
      can_delete_own_workouts: canDeleteOwnWorkouts,
      can_delete_admin_workouts: canDeleteAdminWorkouts,
      can_create_routines: canCreateRoutines,
      can_edit_own_routines: canEditOwnRoutines,
      can_edit_admin_routines: canEditAdminRoutines,
      can_delete_own_routines: canDeleteOwnRoutines,
      can_delete_admin_routines: canDeleteAdminRoutines,
      can_create_plans: canCreatePlans,
      can_edit_own_plans: canEditOwnPlans,
      can_edit_admin_plans: canEditAdminPlans,
      can_delete_own_plans: canDeleteOwnPlans,
      can_delete_admin_plans: canDeleteAdminPlans,
      can_assign_coaches: canAssignCoaches,
      can_edit_athlete_profile: canEditAthleteProfile,
      can_delete_athletes: canDeleteAthletes,
      can_view_staff: canViewStaff,
      can_manage_staff: canManageStaff,
      can_view_all_staff: canViewAllStaff,
      can_assign_permissions: canAssignPermissions,
      can_view_groups: canViewGroups,
      can_create_groups: canCreateGroups,
      can_edit_own_groups: canEditOwnGroups,
      can_edit_all_groups: canEditAllGroups,
      can_delete_own_groups: canDeleteOwnGroups,
      can_delete_all_groups: canDeleteAllGroups,
      can_assign_athletes_to_groups: canAssignAthletesToGroups,
      groups_visibility: groupsVisibility,
      can_sync_force_plates: canSyncForcePlates,
      allowed_exercise_tags: allowedExerciseTags.length > 0 ? allowedExerciseTags : null,
    };

    const { error } = await supabase
      .from('staff_permissions')
      .upsert(permissionsData, {
        onConflict: 'staff_id'
      });

    if (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions');
      setSaving(false);
    } else {
      alert('Permissions saved successfully!');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-12 text-gray-400">
          Loading permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Permissions</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Content Visibility Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Content Visibility</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Exercises Visibility</label>
                <select
                  value={exercisesVisibility}
                  onChange={(e) => setExercisesVisibility(e.target.value as ContentVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="own" className="bg-black">See Their Own</option>
                  <option value="own_and_admin" className="bg-black">See Their Own + Admin</option>
                  <option value="all" className="bg-black">See All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Workouts Visibility</label>
                <select
                  value={workoutsVisibility}
                  onChange={(e) => setWorkoutsVisibility(e.target.value as ContentVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="own" className="bg-black">See Their Own</option>
                  <option value="own_and_admin" className="bg-black">See Their Own + Admin</option>
                  <option value="all" className="bg-black">See All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Routines Visibility</label>
                <select
                  value={routinesVisibility}
                  onChange={(e) => setRoutinesVisibility(e.target.value as ContentVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="own" className="bg-black">See Their Own</option>
                  <option value="own_and_admin" className="bg-black">See Their Own + Admin</option>
                  <option value="all" className="bg-black">See All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Athletes Visibility</label>
                <select
                  value={athletesVisibility}
                  onChange={(e) => setAthletesVisibility(e.target.value as AthleteVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="assigned" className="bg-black">Assigned Only</option>
                  <option value="all" className="bg-black">All Athletes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Plans Visibility</label>
                <select
                  value={plansVisibility}
                  onChange={(e) => setPlansVisibility(e.target.value as ContentVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="own" className="bg-black">See Their Own</option>
                  <option value="own_and_admin" className="bg-black">See Their Own + Admin</option>
                  <option value="all" className="bg-black">See All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Groups Visibility</label>
                <select
                  value={groupsVisibility}
                  onChange={(e) => setGroupsVisibility(e.target.value as GroupsVisibility)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="own" className="bg-black">See Their Own</option>
                  <option value="assigned" className="bg-black">Assigned Groups</option>
                  <option value="all" className="bg-black">See All</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exercise Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Exercises</h3>
            <div className="space-y-2 mb-6">
              <PermissionToggle label="Can Create Exercises" checked={canCreateExercises} onChange={setCanCreateExercises} />
              <PermissionToggle label="Can Edit Own Exercises" checked={canEditOwnExercises} onChange={setCanEditOwnExercises} />
              <PermissionToggle label="Can Edit Admin Exercises" checked={canEditAdminExercises} onChange={setCanEditAdminExercises} />
              <PermissionToggle label="Can Delete Own Exercises" checked={canDeleteOwnExercises} onChange={setCanDeleteOwnExercises} />
              <PermissionToggle label="Can Delete Admin Exercises" checked={canDeleteAdminExercises} onChange={setCanDeleteAdminExercises} />
            </div>

            {/* Tag-Based Exercise Filtering */}
            <div className="pt-6 border-t border-white/10">
              <h4 className="text-base font-semibold text-white mb-2">Tag Restrictions</h4>
              <p className="text-sm text-gray-400 mb-4">
                Optionally limit which exercises this staff member can see based on tags. If no tags are selected, normal visibility rules apply.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableTags.length === 0 ? (
                  <div className="text-sm text-gray-500 italic py-2">Loading tags...</div>
                ) : (
                  <>
                    {/* Select All / Clear All */}
                    <div className="flex gap-2 mb-3 pb-3 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => setAllowedExerciseTags(availableTags)}
                        className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded border border-blue-500/50 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedExerciseTags([])}
                        className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-gray-300 rounded border border-white/20 transition-colors"
                      >
                        Clear All
                      </button>
                      {allowedExerciseTags.length > 0 && (
                        <span className="px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded border border-green-500/50">
                          {allowedExerciseTags.length} selected
                        </span>
                      )}
                    </div>

                    {/* Tag checkboxes */}
                    {availableTags.map(tag => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={allowedExerciseTags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedExerciseTags([...allowedExerciseTags, tag]);
                            } else {
                              setAllowedExerciseTags(allowedExerciseTags.filter(t => t !== tag));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-white capitalize">{tag}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Workout Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Workouts</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can Create Workouts" checked={canCreateWorkouts} onChange={setCanCreateWorkouts} />
              <PermissionToggle label="Can Edit Own Workouts" checked={canEditOwnWorkouts} onChange={setCanEditOwnWorkouts} />
              <PermissionToggle label="Can Edit Admin Workouts" checked={canEditAdminWorkouts} onChange={setCanEditAdminWorkouts} />
              <PermissionToggle label="Can Delete Own Workouts" checked={canDeleteOwnWorkouts} onChange={setCanDeleteOwnWorkouts} />
              <PermissionToggle label="Can Delete Admin Workouts" checked={canDeleteAdminWorkouts} onChange={setCanDeleteAdminWorkouts} />
            </div>
          </div>

          {/* Routine Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Routines</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can Create Routines" checked={canCreateRoutines} onChange={setCanCreateRoutines} />
              <PermissionToggle label="Can Edit Own Routines" checked={canEditOwnRoutines} onChange={setCanEditOwnRoutines} />
              <PermissionToggle label="Can Edit Admin Routines" checked={canEditAdminRoutines} onChange={setCanEditAdminRoutines} />
              <PermissionToggle label="Can Delete Own Routines" checked={canDeleteOwnRoutines} onChange={setCanDeleteOwnRoutines} />
              <PermissionToggle label="Can Delete Admin Routines" checked={canDeleteAdminRoutines} onChange={setCanDeleteAdminRoutines} />
            </div>
          </div>

          {/* Plans Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Plans</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can Create Plans" checked={canCreatePlans} onChange={setCanCreatePlans} />
              <PermissionToggle label="Can Edit Own Plans" checked={canEditOwnPlans} onChange={setCanEditOwnPlans} />
              <PermissionToggle label="Can Edit Admin Plans" checked={canEditAdminPlans} onChange={setCanEditAdminPlans} />
              <PermissionToggle label="Can Delete Own Plans" checked={canDeleteOwnPlans} onChange={setCanDeleteOwnPlans} />
              <PermissionToggle label="Can Delete Admin Plans" checked={canDeleteAdminPlans} onChange={setCanDeleteAdminPlans} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Athlete Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Athletes</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can Assign Coaches" checked={canAssignCoaches} onChange={setCanAssignCoaches} />
              <PermissionToggle label="Can Edit Athlete Profiles" checked={canEditAthleteProfile} onChange={setCanEditAthleteProfile} />
              <PermissionToggle label="Can Delete Athletes" checked={canDeleteAthletes} onChange={setCanDeleteAthletes} />
            </div>
          </div>

          {/* Staff Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Staff Management</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can View Staff Page" checked={canViewStaff} onChange={setCanViewStaff} />
              <PermissionToggle label="Can Manage Staff" checked={canManageStaff} onChange={setCanManageStaff} />
              <PermissionToggle label="Can View All Staff" checked={canViewAllStaff} onChange={setCanViewAllStaff} />
              <PermissionToggle label="Can Assign Permissions" checked={canAssignPermissions} onChange={setCanAssignPermissions} />
            </div>
          </div>

          {/* Groups Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Groups Management</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can View Groups" checked={canViewGroups} onChange={setCanViewGroups} />
              <PermissionToggle label="Can Create Groups" checked={canCreateGroups} onChange={setCanCreateGroups} />
              <PermissionToggle label="Can Edit Own Groups" checked={canEditOwnGroups} onChange={setCanEditOwnGroups} />
              <PermissionToggle label="Can Edit All Groups" checked={canEditAllGroups} onChange={setCanEditAllGroups} />
              <PermissionToggle label="Can Delete Own Groups" checked={canDeleteOwnGroups} onChange={setCanDeleteOwnGroups} />
              <PermissionToggle label="Can Delete All Groups" checked={canDeleteAllGroups} onChange={setCanDeleteAllGroups} />
              <PermissionToggle label="Can Assign Athletes to Groups" checked={canAssignAthletesToGroups} onChange={setCanAssignAthletesToGroups} />
            </div>
          </div>

          {/* VALD Force Plates */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">VALD Integration</h3>
            <div className="space-y-2">
              <PermissionToggle label="Can Sync Force Plates" checked={canSyncForcePlates} onChange={setCanSyncForcePlates} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function PermissionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
      <span className="text-sm text-white">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
