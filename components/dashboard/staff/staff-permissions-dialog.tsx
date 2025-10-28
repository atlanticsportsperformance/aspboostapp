'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import type { StaffPermissions, ContentVisibility, AthleteVisibility } from '@/lib/auth/permissions';

interface StaffPermissionsDialogProps {
  staff: {
    id: string;
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
      email: string;
      app_role: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffPermissionsDialog({ staff, onClose, onSuccess }: StaffPermissionsDialogProps) {
  const { permissions: existingPermissions, loading } = useStaffPermissions(staff.user_id);
  const [saving, setSaving] = useState(false);

  // Permission states
  const [exercisesVisibility, setExercisesVisibility] = useState<ContentVisibility>('own_and_admin');
  const [workoutsVisibility, setWorkoutsVisibility] = useState<ContentVisibility>('own_and_admin');
  const [routinesVisibility, setRoutinesVisibility] = useState<ContentVisibility>('own_and_admin');
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

  // Load existing permissions
  useEffect(() => {
    if (existingPermissions) {
      setExercisesVisibility(existingPermissions.exercises_visibility);
      setWorkoutsVisibility(existingPermissions.workouts_visibility);
      setRoutinesVisibility(existingPermissions.routines_visibility);
      setAthletesVisibility(existingPermissions.athletes_visibility);

      setCanCreateExercises(existingPermissions.can_create_exercises);
      setCanEditOwnExercises(existingPermissions.can_edit_own_exercises);
      setCanEditAdminExercises(existingPermissions.can_edit_admin_exercises);
      setCanDeleteOwnExercises(existingPermissions.can_delete_own_exercises);
      setCanDeleteAdminExercises(existingPermissions.can_delete_admin_exercises);

      setCanCreateWorkouts(existingPermissions.can_create_workouts);
      setCanEditOwnWorkouts(existingPermissions.can_edit_own_workouts);
      setCanEditAdminWorkouts(existingPermissions.can_edit_admin_workouts);
      setCanDeleteOwnWorkouts(existingPermissions.can_delete_own_workouts);
      setCanDeleteAdminWorkouts(existingPermissions.can_delete_admin_workouts);

      setCanCreateRoutines(existingPermissions.can_create_routines);
      setCanEditOwnRoutines(existingPermissions.can_edit_own_routines);
      setCanEditAdminRoutines(existingPermissions.can_edit_admin_routines);
      setCanDeleteOwnRoutines(existingPermissions.can_delete_own_routines);
      setCanDeleteAdminRoutines(existingPermissions.can_delete_admin_routines);
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
      setSaving(false);
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1a1a1a] z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Staff Permissions</h2>
            <p className="text-sm text-gray-400 mt-1">
              {staff.profile.first_name} {staff.profile.last_name} ({staff.profile.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            Loading permissions...
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Content Visibility Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Content Visibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Exercises Visibility</label>
                  <select
                    value={exercisesVisibility}
                    onChange={(e) => setExercisesVisibility(e.target.value as ContentVisibility)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="own">See Their Own</option>
                    <option value="own_and_admin">See Their Own + Admin</option>
                    <option value="all">See All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Workouts Visibility</label>
                  <select
                    value={workoutsVisibility}
                    onChange={(e) => setWorkoutsVisibility(e.target.value as ContentVisibility)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="own">See Their Own</option>
                    <option value="own_and_admin">See Their Own + Admin</option>
                    <option value="all">See All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Routines Visibility</label>
                  <select
                    value={routinesVisibility}
                    onChange={(e) => setRoutinesVisibility(e.target.value as ContentVisibility)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="own">See Their Own</option>
                    <option value="own_and_admin">See Their Own + Admin</option>
                    <option value="all">See All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Athletes Visibility</label>
                  <select
                    value={athletesVisibility}
                    onChange={(e) => setAthletesVisibility(e.target.value as AthleteVisibility)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="assigned">Assigned Only</option>
                    <option value="all">All Athletes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exercise Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Exercise Permissions</h3>
              <div className="space-y-2">
                <PermissionToggle
                  label="Can Create Exercises"
                  checked={canCreateExercises}
                  onChange={setCanCreateExercises}
                />
                <PermissionToggle
                  label="Can Edit Own Exercises"
                  checked={canEditOwnExercises}
                  onChange={setCanEditOwnExercises}
                />
                <PermissionToggle
                  label="Can Edit Admin Exercises"
                  checked={canEditAdminExercises}
                  onChange={setCanEditAdminExercises}
                />
                <PermissionToggle
                  label="Can Delete Own Exercises"
                  checked={canDeleteOwnExercises}
                  onChange={setCanDeleteOwnExercises}
                />
                <PermissionToggle
                  label="Can Delete Admin Exercises"
                  checked={canDeleteAdminExercises}
                  onChange={setCanDeleteAdminExercises}
                />
              </div>
            </div>

            {/* Workout Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Workout Permissions</h3>
              <div className="space-y-2">
                <PermissionToggle
                  label="Can Create Workouts"
                  checked={canCreateWorkouts}
                  onChange={setCanCreateWorkouts}
                />
                <PermissionToggle
                  label="Can Edit Own Workouts"
                  checked={canEditOwnWorkouts}
                  onChange={setCanEditOwnWorkouts}
                />
                <PermissionToggle
                  label="Can Edit Admin Workouts"
                  checked={canEditAdminWorkouts}
                  onChange={setCanEditAdminWorkouts}
                />
                <PermissionToggle
                  label="Can Delete Own Workouts"
                  checked={canDeleteOwnWorkouts}
                  onChange={setCanDeleteOwnWorkouts}
                />
                <PermissionToggle
                  label="Can Delete Admin Workouts"
                  checked={canDeleteAdminWorkouts}
                  onChange={setCanDeleteAdminWorkouts}
                />
              </div>
            </div>

            {/* Routine Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Routine Permissions</h3>
              <div className="space-y-2">
                <PermissionToggle
                  label="Can Create Routines"
                  checked={canCreateRoutines}
                  onChange={setCanCreateRoutines}
                />
                <PermissionToggle
                  label="Can Edit Own Routines"
                  checked={canEditOwnRoutines}
                  onChange={setCanEditOwnRoutines}
                />
                <PermissionToggle
                  label="Can Edit Admin Routines"
                  checked={canEditAdminRoutines}
                  onChange={setCanEditAdminRoutines}
                />
                <PermissionToggle
                  label="Can Delete Own Routines"
                  checked={canDeleteOwnRoutines}
                  onChange={setCanDeleteOwnRoutines}
                />
                <PermissionToggle
                  label="Can Delete Admin Routines"
                  checked={canDeleteAdminRoutines}
                  onChange={setCanDeleteAdminRoutines}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 sticky bottom-0 bg-[#1a1a1a]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
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
