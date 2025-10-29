'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Search, Calendar, Clock, Dumbbell } from 'lucide-react';
import { getContentFilter } from '@/lib/auth/permissions';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';

interface Routine {
  id: string;
  name: string;
  scheme: string;
  is_standalone: boolean;
  workout_id: string | null;
  exercises_count?: number;
}

interface AddRoutineToGroupModalProps {
  groupId: string;
  initialDate: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddRoutineToGroupModal({
  groupId,
  initialDate,
  onClose,
  onAdded
}: AddRoutineToGroupModalProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [filteredRoutines, setFilteredRoutines] = useState<Routine[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [scheduledTime, setScheduledTime] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [notes, setNotes] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);

  const supabase = createClient();

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role);
        }
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchRoutines();
    }
  }, [userId, userRole, permissions]);

  useEffect(() => {
    // Filter routines based on search term
    if (searchTerm.trim() === '') {
      setFilteredRoutines(routines);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredRoutines(
        routines.filter(
          r =>
            r.name.toLowerCase().includes(term) ||
            r.scheme.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, routines]);

  async function fetchRoutines() {
    if (!userId) return;

    // Apply visibility filtering
    const filter = await getContentFilter(userId, userRole, 'routines');

    let query = supabase
      .from('routines')
      .select(`
        *,
        routine_exercises(id)
      `)
      .eq('is_standalone', true);

    // Apply visibility filter
    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setRoutines([]);
        setFilteredRoutines([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    query = query.order('created_at', { ascending: false });

    const { data: standaloneRoutines, error } = await query;

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      console.log('✅ Standalone routines available (with permissions):', standaloneRoutines?.length);
      // Add exercises count
      const enriched = (standaloneRoutines || []).map(r => ({
        ...r,
        exercises_count: r.routine_exercises?.length || 0,
        routine_exercises: undefined // Remove nested data
      }));
      setRoutines(enriched);
      setFilteredRoutines(enriched);
    }

    setLoading(false);
  }

  async function handleAddRoutine() {
    if (!selectedRoutineId || !scheduledDate || !workoutName.trim()) {
      alert('Please select a routine, enter a workout name, and choose a date');
      return;
    }

    setSaving(true);

    try {
      // Step 1: Fetch the routine with all exercises
      const { data: templateRoutine, error: routineError } = await supabase
        .from('routines')
        .select(`
          *,
          routine_exercises (*)
        `)
        .eq('id', selectedRoutineId)
        .single();

      if (routineError || !templateRoutine) {
        throw new Error('Failed to fetch routine');
      }

      // Step 2: Create a group-owned workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: workoutName,
          category: null, // Can be set later
          is_template: false,
          group_id: groupId,
          notes: notes || null,
          is_active: true
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        throw new Error('Failed to create workout');
      }

      // Step 3: Copy the routine to the new workout
      const { data: newRoutine, error: newRoutineError } = await supabase
        .from('routines')
        .insert({
          workout_id: newWorkout.id,
          name: templateRoutine.name,
          scheme: templateRoutine.scheme,
          order_index: 0,
          is_standalone: false,
          group_id: groupId,
          source_routine_id: templateRoutine.id
        })
        .select()
        .single();

      if (newRoutineError || !newRoutine) {
        throw new Error('Failed to copy routine');
      }

      // Step 4: Copy all exercises
      if (templateRoutine.routine_exercises && templateRoutine.routine_exercises.length > 0) {
        const exerciseCopies = templateRoutine.routine_exercises.map((ex: any) => ({
          routine_id: newRoutine.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          percent_1rm: ex.percent_1rm,
          rpe_target: ex.rpe_target,
          rest_seconds: ex.rest_seconds,
          metric_targets: ex.metric_targets,
          intensity_targets: ex.intensity_targets,
          set_configurations: ex.set_configurations,
          notes: ex.notes,
          is_amrap: ex.is_amrap,
          is_placeholder: ex.is_placeholder,
          placeholder_id: ex.placeholder_id,
          placeholder_name: ex.placeholder_name
        }));

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(exerciseCopies);

        if (exercisesError) {
          throw new Error('Failed to copy exercises');
        }
      }

      // Step 5: Create the group workout schedule
      const { data: { user } } = await supabase.auth.getUser();

      const { error: scheduleError } = await supabase
        .from('group_workout_schedules')
        .insert({
          group_id: groupId,
          workout_id: newWorkout.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          notes: notes || null,
          auto_assign: autoAssign,
          created_by: user?.id
        });

      if (scheduleError) {
        throw new Error('Failed to create schedule');
      }

      console.log('✅ Routine added to group calendar successfully');
      onAdded();
    } catch (err: any) {
      console.error('Error adding routine to group:', err);
      alert(`Failed to add routine: ${err.message}`);
      setSaving(false);
    }
  }

  function getSchemeColor(scheme: string) {
    switch (scheme?.toLowerCase()) {
      case 'straight':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'superset':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'circuit':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'emom':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'amrap':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#9BDDFF]/10 rounded-lg">
              <Dumbbell className="text-[#9BDDFF]" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Add Routine to Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search routines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
            />
          </div>

          {/* Routine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Routine *
            </label>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading routines...</div>
            ) : filteredRoutines.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No routines found' : 'No standalone routines available.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredRoutines.map((routine) => (
                  <button
                    key={routine.id}
                    onClick={() => setSelectedRoutineId(routine.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRoutineId === routine.id
                        ? 'bg-[#9BDDFF]/10 border-[#9BDDFF] ring-2 ring-[#9BDDFF]/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{routine.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded border ${getSchemeColor(routine.scheme)}`}>
                            {routine.scheme.toUpperCase()}
                          </span>
                          {routine.exercises_count! > 0 && (
                            <span className="text-xs text-gray-400">
                              {routine.exercises_count} exercises
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedRoutineId === routine.id && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#9BDDFF] flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workout Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Workout Name *
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g., Morning Strength Session"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
            />
          </div>

          {/* Schedule Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Date *
                </div>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Time (optional)
                </div>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent resize-none"
              placeholder="Any special instructions for the group..."
            />
          </div>

          {/* Auto-assign toggle */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <input
              type="checkbox"
              id="auto-assign-routine"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="w-4 h-4 text-[#9BDDFF] bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-[#9BDDFF]"
            />
            <label htmlFor="auto-assign-routine" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-white">Auto-assign to all members</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Automatically create workout instances for all group members and sync updates
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddRoutine}
            disabled={saving || !selectedRoutineId || !scheduledDate || !workoutName.trim()}
            className="flex-1 px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Adding Routine...' : 'Add to Group Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
}
