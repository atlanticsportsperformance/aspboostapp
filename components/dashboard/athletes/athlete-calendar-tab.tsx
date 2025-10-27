'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AssignPlanModal } from './assign-plan-modal';
import { WorkoutBuilderModal } from '@/components/dashboard/plans/workout-builder-modal';
import { CreateWorkoutForAthleteModal } from './create-workout-for-athlete-modal';
import { AddWorkoutToAthleteModal } from './add-workout-to-athlete-modal';
import { AddRoutineToAthleteModal } from './add-routine-to-athlete-modal';
import { FullscreenCalendarModal } from './fullscreen-calendar-modal';

interface CalendarTabProps {
  athleteId: string;
}

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  athlete_id: string | null;
}

interface WorkoutInstance {
  id: string;
  workout_id: string;
  athlete_id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  source_type: string | null;
  source_id: string | null;
  workouts: Workout | null;
  group?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

// Helper function to format category names
function formatCategory(category: string | null) {
  if (!category) return 'N/A';
  // Convert STRENGTH_CONDITIONING to Strength & Conditioning
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' & ');
}

export default function AthleteCalendarTab({ athleteId }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutInstances, setWorkoutInstances] = useState<WorkoutInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutInstance | null>(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState<{ date: string } | null>(null);
  const [showRoutineLibrary, setShowRoutineLibrary] = useState<{ date: string } | null>(null);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState<{ date: string } | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WorkoutInstance | null>(null);
  const [showImportPlan, setShowImportPlan] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(true); // Toggle for month overview
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedWorkout, setCopiedWorkout] = useState<{ instanceId: string; workoutName: string } | null>(null);
  const [renderVersion, setRenderVersion] = useState(0); // Force re-render counter

  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchWorkoutInstances();
  }, [athleteId, currentDate, showWorkoutDetails]);

  async function fetchWorkoutInstances() {
    // Only show loading on initial load or date change, not on detail toggle
    const isInitialLoad = workoutInstances.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }

    // Get first and last day of current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = lastDay.toISOString().split('T')[0];

    // Fetch with or without routine details based on toggle
    const selectQuery = showWorkoutDetails
      ? `
        *,
        workouts (
          id,
          name,
          category,
          estimated_duration_minutes,
          notes,
          athlete_id,
          routines (
            id,
            name,
            scheme,
            order_index,
            routine_exercises (
              id,
              order_index,
              sets,
              reps_min,
              reps_max,
              exercises (
                id,
                name
              )
            )
          )
        )
      `
      : `
        *,
        workouts (id, name, category, estimated_duration_minutes, notes, athlete_id)
      `;

    const { data, error } = await supabase
      .from('workout_instances')
      .select(selectQuery)
      .eq('athlete_id', athleteId)
      .gte('scheduled_date', startStr)
      .lte('scheduled_date', endStr)
      .order('scheduled_date');

    if (error) {
      console.error('Error fetching workout instances:', error);
      setLoading(false);
      return;
    }

    // Enrich with group data for group-sourced workouts
    const enrichedData = await Promise.all(
      (data || []).map(async (instance) => {
        if (instance.source_type === 'group' && instance.source_id) {
          // Fetch group info from group_workout_schedules
          const { data: scheduleData } = await supabase
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

          if (scheduleData?.groups) {
            return {
              ...instance,
              group: scheduleData.groups
            };
          }
        }
        return instance;
      })
    );

    setWorkoutInstances(enrichedData);
    setLoading(false);
  }

  // Memoize workout-by-date mapping to ensure re-renders when workoutInstances changes
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutInstance[]>();
    workoutInstances.forEach(wi => {
      const dateStr = wi.scheduled_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(wi);
    });
    console.log('🔄 Rebuilding workoutsByDate map with', workoutInstances.length, 'workouts');
    console.log('📋 Map contents:', Array.from(map.entries()).map(([date, workouts]) => `${date}: ${workouts.length}`).join(', '));
    return map;
  }, [workoutInstances]);

  function getWorkoutsForDate(dateStr: string): WorkoutInstance[] {
    const workouts = workoutsByDate.get(dateStr) || [];
    if (workouts.length > 0) {
      console.log(`📅 getWorkoutsForDate(${dateStr}):`, workouts.length, 'workouts');
    }
    return workouts;
  }

  // Force re-render trigger - create a stable key based on workout positions and render version
  const calendarKey = `v${renderVersion}-${workoutInstances.map(w => `${w.id}:${w.scheduled_date}`).sort().join('|')}`;

  function handleDragStart(event: DragStartEvent) {
    const workoutInstance = event.active.data.current?.workoutInstance;
    setActiveWorkout(workoutInstance);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveWorkout(null);
      return;
    }

    const targetDate = over.data.current?.date;
    if (!targetDate) {
      setActiveWorkout(null);
      return;
    }

    // Check if dragging a recommendation
    if (active.data.current?.type === 'recommendation') {
      const { recommendationType, item } = active.data.current;

      if (recommendationType === 'plan') {
        // Handle plan drop - show assign plan modal with pre-selected plan
        alert(`Dropping plan "${item.name}" on ${targetDate}. Plan assignment coming soon!`);
      } else if (recommendationType === 'workout') {
        // Handle workout drop - create workout instance
        await handleWorkoutDrop(item, targetDate);
      }

      setActiveWorkout(null);
      return;
    }

    // Handle existing workout instance drag (moving workouts)
    const workoutInstance = active.data.current?.workoutInstance;
    if (!workoutInstance) {
      setActiveWorkout(null);
      return;
    }

    // Don't update if dropping on same date
    if (workoutInstance.scheduled_date === targetDate) {
      setActiveWorkout(null);
      return;
    }

    console.log('🔄 Moving workout from', workoutInstance.scheduled_date, 'to', targetDate);
    console.log('📊 Before update - workoutInstances count:', workoutInstances.length);

    // Optimistically update state immediately (no flicker)
    // Create a completely new array to ensure React detects the change
    const updatedInstances = workoutInstances.map(instance =>
      instance.id === workoutInstance.id
        ? { ...instance, scheduled_date: targetDate }
        : instance
    );

    console.log('✅ After optimistic update - workoutInstances count:', updatedInstances.length);
    const movedWorkout = updatedInstances.find(i => i.id === workoutInstance.id);
    console.log('📍 Updated workout new date:', movedWorkout?.scheduled_date);

    setWorkoutInstances(updatedInstances);

    // Force re-render by incrementing version
    setRenderVersion(v => v + 1);

    setActiveWorkout(null);

    // Update database in background
    const { error } = await supabase
      .from('workout_instances')
      .update({ scheduled_date: targetDate })
      .eq('id', workoutInstance.id);

    if (error) {
      console.error('Error moving workout:', error);
      alert('Failed to move workout');
      // Revert optimistic update on error
      await fetchWorkoutInstances();
    }
  }

  async function handleWorkoutDrop(workout: any, targetDate: string) {
    try {
      // Create a workout instance for this athlete
      const { data: newInstance, error } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: workout.id,
          athlete_id: athleteId,
          scheduled_date: targetDate,
          status: 'not_started'
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh workout instances to show the new one
      await fetchWorkoutInstances();
    } catch (error) {
      console.error('Error creating workout instance:', error);
      alert('Failed to add workout to calendar');
    }
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  async function handleDeleteWorkout(workoutInstanceId: string) {
    if (!confirm('Remove this workout from the schedule? This will also delete the workout and all its routines.')) {
      return;
    }

    // First, get the workout instance to find the workout_id
    const { data: instance, error: fetchError } = await supabase
      .from('workout_instances')
      .select('workout_id, workouts(athlete_id)')
      .eq('id', workoutInstanceId)
      .single();

    if (fetchError) {
      console.error('Error fetching workout instance:', fetchError);
      alert('Failed to delete workout');
      return;
    }

    const workoutId = instance.workout_id;
    const isAthleteWorkout = instance.workouts?.athlete_id === athleteId;

    // Delete the workout instance first
    const { error: instanceError } = await supabase
      .from('workout_instances')
      .delete()
      .eq('id', workoutInstanceId);

    if (instanceError) {
      console.error('Error deleting workout instance:', instanceError);
      alert('Failed to delete workout instance');
      return;
    }

    // If this workout belongs to the athlete (not a template), delete the workout and its routines
    if (isAthleteWorkout && workoutId) {
      // Delete routine exercises first (cascade might not be set up)
      const { data: routines } = await supabase
        .from('routines')
        .select('id')
        .eq('workout_id', workoutId);

      if (routines && routines.length > 0) {
        const routineIds = routines.map(r => r.id);
        await supabase
          .from('routine_exercises')
          .delete()
          .in('routine_id', routineIds);
      }

      // Delete routines
      await supabase
        .from('routines')
        .delete()
        .eq('workout_id', workoutId);

      // Delete the workout itself
      const { error: workoutError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (workoutError) {
        console.error('Error deleting workout:', workoutError);
        // Don't show error to user since instance was already deleted
      }
    }

    await fetchWorkoutInstances();
  }

  // Copy workout instance
  function handleCopyWorkout(instanceId: string, workoutName: string) {
    setCopiedWorkout({ instanceId, workoutName });
  }

  // Paste copied workout to a new date
  async function handlePasteWorkout(targetDate: string) {
    if (!copiedWorkout) return;

    try {
      // Get the source workout instance with all its data
      const { data: sourceInstance, error: fetchError } = await supabase
        .from('workout_instances')
        .select(`
          *,
          workouts (
            *,
            routines (
              *,
              routine_exercises (*)
            )
          )
        `)
        .eq('id', copiedWorkout.instanceId)
        .single();

      if (fetchError || !sourceInstance || !sourceInstance.workouts) {
        alert('Failed to load workout data');
        return;
      }

      const sourceWorkout = sourceInstance.workouts;

      // Create a new workout (copy)
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: sourceWorkout.name,
          category: sourceWorkout.category,
          estimated_duration_minutes: sourceWorkout.estimated_duration_minutes,
          notes: sourceWorkout.notes,
          tags: sourceWorkout.tags,
          is_template: false,
          athlete_id: athleteId,
          plan_id: null,
          placeholder_definitions: sourceWorkout.placeholder_definitions
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error('Error creating workout:', workoutError);
        alert('Failed to create workout');
        return;
      }

      // Copy routines
      if (sourceWorkout.routines && sourceWorkout.routines.length > 0) {
        for (const routine of sourceWorkout.routines) {
          const { data: newRoutine, error: routineError } = await supabase
            .from('routines')
            .insert({
              workout_id: newWorkout.id,
              name: routine.name,
              scheme: routine.scheme,
              order_index: routine.order_index,
              rest_between_rounds_seconds: routine.rest_between_rounds_seconds,
              notes: routine.notes,
              superset_block_name: routine.superset_block_name,
              text_info: routine.text_info,
              is_standalone: false,
              plan_id: null,
              athlete_id: athleteId
            })
            .select()
            .single();

          if (routineError || !newRoutine) {
            console.error('Error creating routine:', routineError);
            continue;
          }

          // Copy exercises
          if (routine.routine_exercises && routine.routine_exercises.length > 0) {
            const exercisesToCopy = routine.routine_exercises.map((ex: any) => ({
              routine_id: newRoutine.id,
              exercise_id: ex.exercise_id,
              is_placeholder: ex.is_placeholder || false,
              placeholder_id: ex.placeholder_id,
              placeholder_name: ex.placeholder_name,
              order_index: ex.order_index,
              sets: ex.sets,
              reps_min: ex.reps_min,
              reps_max: ex.reps_max,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
              metric_targets: ex.metric_targets,
              intensity_targets: ex.intensity_targets,
              set_configurations: ex.set_configurations,
              enabled_measurements: ex.enabled_measurements,
              tracked_max_metrics: ex.tracked_max_metrics,
              is_amrap: ex.is_amrap
            }));

            await supabase.from('routine_exercises').insert(exercisesToCopy);
          }
        }
      }

      // Create new workout instance
      const { error: instanceError } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: newWorkout.id,
          athlete_id: athleteId,
          scheduled_date: targetDate,
          status: 'not_started'
        });

      if (instanceError) {
        console.error('Error creating workout instance:', instanceError);
        alert('Failed to schedule workout');
        return;
      }

      // Refresh calendar
      await fetchWorkoutInstances();
    } catch (error) {
      console.error('Error pasting workout:', error);
      alert('Failed to paste workout');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Loading calendar...</div>
      </div>
    );
  }

  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const days = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Render calendar content (reusable for normal and fullscreen views)
  const renderCalendar = (isFullscreenView = false) => (
    <>
      <div className={isFullscreenView ? "h-full p-4 lg:p-6" : "min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 p-4 lg:p-6"}>
        {/* Copied Workout Notification */}
        {copiedWorkout && (
          <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-yellow-300 text-sm font-medium">
                "{copiedWorkout.workoutName}" copied - Click + in any day to paste
              </span>
            </div>
            <button
              onClick={() => setCopiedWorkout(null)}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
              title="Clear copied workout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 md:mb-6">
          {/* Month Navigation - Mobile Optimized */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 md:p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                title="Previous month"
              >
                <svg className="w-5 h-5 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white">
                <span className="md:hidden">{currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span className="hidden md:inline">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </h2>

              <button
                onClick={goToNextMonth}
                className="p-2 md:p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                title="Next month"
              >
                <svg className="w-5 h-5 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm rounded-lg transition-all font-medium touch-manipulation"
              >
                Today
              </button>
            </div>

            {/* Mobile: Workout count */}
            <div className="md:hidden text-xs text-neutral-400">
              {workoutInstances.length} workout{workoutInstances.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowWorkoutDetails(!showWorkoutDetails)}
              className={`px-3 py-1.5 md:px-4 md:py-2 border text-xs md:text-sm rounded-lg transition-all font-medium flex items-center gap-1.5 md:gap-2 touch-manipulation ${
                showWorkoutDetails
                  ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
                  : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'
              }`}
              title={showWorkoutDetails ? 'Hide Workout Details' : 'Show Workout Details'}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">{showWorkoutDetails ? 'Hide' : 'Show'}</span>
              <span className="sm:hidden">{showWorkoutDetails ? '−' : '+'}</span>
            </button>
            <button
              onClick={() => setShowImportPlan(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs md:text-sm rounded-lg transition-all font-medium flex items-center gap-1.5 md:gap-2 touch-manipulation"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Import Plan</span>
              <span className="sm:hidden">Import</span>
            </button>
            {!isFullscreenView && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black text-xs md:text-sm rounded-lg transition-all font-medium flex items-center gap-1.5 md:gap-2 touch-manipulation"
                title="Expand Calendar"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="hidden md:inline">Expand</span>
              </button>
            )}
            {/* Desktop: Workout count */}
            <div className="hidden md:block text-sm text-neutral-400 ml-auto">
              {workoutInstances.length} workout{workoutInstances.length !== 1 ? 's' : ''} this month
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Mobile: Horizontal Scroll Wrapper */}
          <div className="md:overflow-visible overflow-x-auto -mx-3 md:mx-0 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
            <div className="min-w-[1100px] md:min-w-0">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="text-center py-2 md:py-3 text-xs md:text-sm font-semibold text-neutral-400 border-r border-neutral-800 last:border-r-0">
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[100px] md:min-h-[120px] bg-neutral-900/30 border-r border-b border-neutral-800"
                      />
                    );
                  }

                  const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                  const dayWorkouts = getWorkoutsForDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  // Create unique key based on date AND workout IDs on that date
                  const cellKey = `${dateStr}-${dayWorkouts.map(w => w.id).join('-')}`;

                  return (
                    <CalendarDayCell
                      key={cellKey}
                      date={dateStr}
                      day={day}
                      workouts={dayWorkouts}
                      isToday={isToday}
                      showDetails={showWorkoutDetails}
                      onWorkoutClick={(instance) => setSelectedInstance(instance)}
                      onWorkoutDelete={(id) => handleDeleteWorkout(id)}
                      onWorkoutCopy={(id, name) => handleCopyWorkout(id, name)}
                      onWorkoutPaste={() => handlePasteWorkout(dateStr)}
                      hasCopiedWorkout={copiedWorkout !== null}
                      onCreateWorkout={() => setShowCreateWorkout({ date: dateStr })}
                      onAddWorkout={() => setShowWorkoutLibrary({ date: dateStr })}
                      onAddRoutine={() => setShowRoutineLibrary({ date: dateStr })}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 md:mt-6 flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
          <span className="text-neutral-400 hidden md:inline">Workout Categories:</span>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded"></div>
            <span className="text-neutral-300">Hitting</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-500 rounded"></div>
            <span className="text-neutral-300">Throwing</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded"></div>
            <span className="text-neutral-300">S&C</span>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWorkout && activeWorkout.workouts ? (
            <div className={`p-3 rounded-lg shadow-2xl border-l-4 opacity-90 ${
              activeWorkout.workouts.category === 'hitting'
                ? 'bg-red-500/20 border-red-500'
                : activeWorkout.workouts.category === 'throwing'
                ? 'bg-blue-500/20 border-blue-500'
                : 'bg-green-500/20 border-green-500'
            }`}>
              <div className="text-sm font-medium text-white">
                {activeWorkout.workouts.name}
              </div>
              {activeWorkout.workouts.estimated_duration_minutes && (
                <div className="text-xs text-neutral-400 mt-1">
                  {activeWorkout.workouts.estimated_duration_minutes}min
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>

        {/* Create Workout Modal */}
        {showCreateWorkout && (
          <CreateWorkoutForAthleteModal
            athleteId={athleteId}
            date={showCreateWorkout.date}
            onClose={() => setShowCreateWorkout(null)}
            onSuccess={(workoutId) => {
              setShowCreateWorkout(null);
              fetchWorkoutInstances();
              setEditingWorkoutId(workoutId); // Open builder modal
            }}
          />
        )}

        {/* Add Workout Modal */}
        {showWorkoutLibrary && (
          <AddWorkoutToAthleteModal
            athleteId={athleteId}
            date={showWorkoutLibrary.date}
            onClose={() => setShowWorkoutLibrary(null)}
            onSuccess={() => {
              setShowWorkoutLibrary(null);
              fetchWorkoutInstances();
            }}
          />
        )}

        {/* Routine Library Modal */}
        {showRoutineLibrary && (
          <AddRoutineToAthleteModal
            athleteId={athleteId}
            date={showRoutineLibrary.date}
            onClose={() => setShowRoutineLibrary(null)}
            onSuccess={() => {
              setShowRoutineLibrary(null);
              fetchWorkoutInstances();
            }}
          />
        )}

        {/* Workout Builder Modal */}
        {editingWorkoutId && (
          <WorkoutBuilderModal
            workoutId={editingWorkoutId}
            planId={null}
            athleteId={athleteId}
            onClose={() => setEditingWorkoutId(null)}
            onSaved={() => {
              fetchWorkoutInstances();
              setEditingWorkoutId(null);
            }}
          />
        )}

        {/* Import Plan Modal */}
        {showImportPlan && (
          <AssignPlanModal
            planId={null}
            athleteId={athleteId}
            onSuccess={() => {
              fetchWorkoutInstances();
              setShowImportPlan(false);
            }}
            onClose={() => setShowImportPlan(false)}
          />
        )}

        {/* Workout Instance Detail Modal */}
        {selectedInstance && (
          <WorkoutInstanceModal
            instance={selectedInstance}
            athleteId={athleteId}
            onClose={() => setSelectedInstance(null)}
            onEdit={() => {
              setEditingWorkoutId(selectedInstance.workout_id);
              setSelectedInstance(null);
            }}
          />
        )}
      </div>
    </>
  );

  // Render fullscreen modal if active
  if (isFullscreen) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <FullscreenCalendarModal
          key={`fullscreen-${renderVersion}-${workoutInstances.map(w => `${w.id}:${w.scheduled_date}`).join('|')}`}
          athleteId={athleteId}
          onClose={() => setIsFullscreen(false)}
          calendarComponent={renderCalendar(true)}
        />
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div key={`calendar-regular-${renderVersion}`}>
        {renderCalendar()}
      </div>
      <DragOverlay>
        {activeWorkout && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-2 cursor-grabbing">
            <p className="text-white text-sm font-medium">{activeWorkout.workouts?.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Calendar Day Cell Component
function CalendarDayCell({
  date,
  day,
  workouts,
  isToday,
  showDetails,
  onWorkoutClick,
  onWorkoutDelete,
  onWorkoutCopy,
  onWorkoutPaste,
  hasCopiedWorkout,
  onCreateWorkout,
  onAddWorkout,
  onAddRoutine,
}: {
  date: string;
  day: number;
  workouts: WorkoutInstance[];
  isToday: boolean;
  showDetails: boolean;
  onWorkoutClick: (instance: WorkoutInstance) => void;
  onWorkoutDelete: (instanceId: string) => void;
  onWorkoutCopy: (instanceId: string, workoutName: string) => void;
  onWorkoutPaste: () => void;
  hasCopiedWorkout: boolean;
  onCreateWorkout: () => void;
  onAddWorkout: () => void;
  onAddRoutine: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[100px] md:min-h-[120px] border-r border-b border-neutral-800 p-1.5 md:p-2 relative transition-all
        ${isOver ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : 'bg-neutral-900/30 hover:bg-neutral-800/30'}
        ${isToday ? 'ring-2 ring-amber-500 ring-inset' : ''}
      `}
    >
      {/* Day Number and Add Button */}
      <div className="flex items-start justify-between mb-1.5 md:mb-2">
        <div className={`
          text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
          ${isToday ? 'bg-amber-500 text-white' : 'text-neutral-400'}
        `}>
          {day}
        </div>

        {/* Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 md:p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors touch-manipulation"
            title="Add workout or routine"
          >
            <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {showDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg py-1 min-w-[150px]">
                {hasCopiedWorkout && (
                  <>
                    <button
                      onClick={() => {
                        onWorkoutPaste();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-yellow-400 hover:text-yellow-300 transition-colors font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Paste Workout
                    </button>
                    <div className="border-t border-neutral-700 my-1"></div>
                  </>
                )}
                <button
                  onClick={() => {
                    onCreateWorkout();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Create Workout
                </button>
                <button
                  onClick={() => {
                    onAddWorkout();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  Add Workout
                </button>
                <button
                  onClick={() => {
                    onAddRoutine();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Add Routine
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Workouts */}
      <div className="space-y-1 md:space-y-1">
        {workouts.slice(0, showDetails ? 3 : 3).map((wi) => (
          wi.workouts && (
            <DraggableWorkoutChip
              key={wi.id}
              workoutInstance={wi}
              showDetails={showDetails}
              onClick={() => onWorkoutClick(wi)}
              onDelete={() => onWorkoutDelete(wi.id)}
              onCopy={() => onWorkoutCopy(wi.id, wi.workouts?.name || 'Workout')}
            />
          )
        ))}
        {workouts.length > 3 && (
          <div className="text-[10px] md:text-xs text-neutral-500 text-center py-0.5 md:py-1">
            +{workouts.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

// Draggable Workout Chip Component
function DraggableWorkoutChip({
  workoutInstance,
  showDetails,
  onClick,
  onDelete,
  onCopy,
}: {
  workoutInstance: WorkoutInstance;
  showDetails: boolean;
  onClick: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-instance-${workoutInstance.id}`,
    data: { workoutInstance },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getCategoryColor = (category: string | null) => {
    if (category === 'hitting') return 'bg-red-500/20 border-red-500/50 text-red-300';
    if (category === 'throwing') return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
    return 'bg-green-500/20 border-green-500/50 text-green-300';
  };

  const getStatusIndicator = (status: string) => {
    if (status === 'completed') return '✓';
    if (status === 'in_progress') return '◐';
    if (status === 'skipped') return '✗';
    return '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group relative px-1.5 md:px-2 py-1 md:py-1.5 rounded border cursor-move transition-all text-xs touch-manipulation
        ${getCategoryColor(workoutInstance.workouts?.category || null)}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-102 hover:shadow-lg'}
      `}
    >
      <div className="flex items-start gap-1">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 min-w-0 cursor-pointer"
        >
          {/* Workout Name and Status */}
          <div className="font-medium flex items-start gap-1">
            {getStatusIndicator(workoutInstance.status) && (
              <span className={`flex-shrink-0 leading-tight text-xs
                ${workoutInstance.status === 'completed' ? 'text-green-400' : ''}
                ${workoutInstance.status === 'in_progress' ? 'text-yellow-400' : ''}
                ${workoutInstance.status === 'skipped' ? 'text-red-400' : ''}
              `}>
                {getStatusIndicator(workoutInstance.status)}
              </span>
            )}
            <span className="break-words leading-tight flex-1 min-w-0 line-clamp-2">
              {workoutInstance.workouts?.name || 'Workout'}
            </span>
          </div>

          {/* Group Indicator */}
          {workoutInstance.group && (
            <div
              className="mt-1 text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-medium"
              style={{ backgroundColor: workoutInstance.group.color + '30', color: workoutInstance.group.color }}
              title={`From group: ${workoutInstance.group.name}`}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {workoutInstance.group.name}
            </div>
          )}

          {/* Duration (always shown) */}
          {workoutInstance.workouts?.estimated_duration_minutes && (
            <div className="text-[10px] opacity-75 mt-0.5">
              {workoutInstance.workouts.estimated_duration_minutes}min
            </div>
          )}

          {/* Detailed View - Routines and Exercises */}
          {showDetails && workoutInstance.workouts?.routines && workoutInstance.workouts.routines.length > 0 && (
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
              {workoutInstance.workouts.routines
                .sort((a, b) => a.order_index - b.order_index)
                .map((routine, routineIndex) => (
                  <div key={routine.id} className="space-y-1">
                    {/* Routine Name as Section Header - Only if not "Exercise" */}
                    {routine.name && routine.name.toLowerCase() !== 'exercise' && (
                      <div className="font-bold text-[10px] text-white/90">
                        {routine.name}
                      </div>
                    )}

                    {/* Exercises */}
                    {routine.routine_exercises && routine.routine_exercises.length > 0 && (
                      <div className="space-y-1.5">
                        {routine.routine_exercises
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((routineExercise, exerciseIndex) => {
                            // Generate exercise code (A1, A2, B1, etc.)
                            const letter = String.fromCharCode(65 + routineIndex); // A, B, C, etc.
                            const number = exerciseIndex + 1;
                            const exerciseCode = `${letter}${number}`;

                            return (
                              <div key={routineExercise.id} className="text-[9px] space-y-0.5">
                                {/* Exercise Code and Name */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-blue-400 font-medium min-w-[16px]">{exerciseCode}</span>
                                  {routineExercise.exercises?.name && (
                                    <span className="text-white/80 font-medium leading-tight">
                                      {routineExercise.exercises.name}
                                    </span>
                                  )}
                                </div>

                                {/* Sets, Reps, and Metrics */}
                                <div className="pl-[20px] text-white/60 space-y-0.5">
                                  {/* Sets and Reps */}
                                  {routineExercise.sets && (
                                    <div>
                                      {routineExercise.sets} Sets, {' '}
                                      {routineExercise.reps_min && routineExercise.reps_max
                                        ? `${routineExercise.reps_min}-${routineExercise.reps_max} reps`
                                        : routineExercise.reps_min
                                        ? `${routineExercise.reps_min} reps`
                                        : routineExercise.time_seconds
                                        ? `${Math.floor(routineExercise.time_seconds / 60)}:${String(routineExercise.time_seconds % 60).padStart(2, '0')}`
                                        : '~ reps'}
                                      {routineExercise.percent_1rm && `, ${routineExercise.percent_1rm}%`}
                                    </div>
                                  )}

                                  {/* Special notes from notes field */}
                                  {routineExercise.notes && (
                                    <div className="italic text-[8px]">
                                      {routineExercise.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="p-0.5 hover:bg-blue-500/30 rounded transition-all"
            title="Copy workout"
          >
            <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 hover:bg-red-500/30 rounded transition-all"
            title="Delete workout"
          >
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Workout Instance Detail Modal
function WorkoutInstanceModal({
  instance,
  athleteId,
  onClose,
  onEdit
}: {
  instance: WorkoutInstance;
  athleteId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-white">{instance.workouts?.name}</h2>
              <p className="text-gray-400 mt-1">{instance.scheduled_date}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4">
            {instance.status === 'not_started' && (
              <>
                <Link
                  href={`/dashboard/athletes/${athleteId}/workouts/${instance.id}/execute`}
                  className="px-6 py-3 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition-colors"
                >
                  Start Workout
                </Link>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Workout
                </button>
              </>
            )}

            {instance.status === 'in_progress' && (
              <>
                <Link
                  href={`/dashboard/athletes/${athleteId}/workouts/${instance.id}/execute`}
                  className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Resume Workout
                </Link>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Workout
                </button>
              </>
            )}

            {instance.status === 'completed' && (
              <>
                <Link
                  href={`/dashboard/athletes/${athleteId}/workouts/${instance.id}/execute`}
                  className="px-6 py-3 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg font-semibold transition-colors"
                >
                  View/Edit Workout
                </Link>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Details
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {instance.workouts?.notes && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-gray-300">{instance.workouts.notes}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-400">Category:</span>
              <span className="ml-2 text-white">{formatCategory(instance.workouts?.category)}</span>
            </div>

            {instance.workouts?.estimated_duration_minutes && (
              <div>
                <span className="text-sm text-gray-400">Duration:</span>
                <span className="ml-2 text-white">{instance.workouts.estimated_duration_minutes} minutes</span>
              </div>
            )}

            <div>
              <span className="text-sm text-gray-400">Status:</span>
              <span className="ml-2 text-white capitalize">{instance.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
