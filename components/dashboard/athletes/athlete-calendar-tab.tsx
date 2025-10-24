'use client';

import { useEffect, useState } from 'react';
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
  workouts: Workout | null;
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
    setLoading(true);

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
    } else {
      setWorkoutInstances(data || []);
    }

    setLoading(false);
  }

  function getWorkoutsForDate(dateStr: string): WorkoutInstance[] {
    return workoutInstances.filter(wi => wi.scheduled_date === dateStr);
  }

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

    const workoutInstance = active.data.current?.workoutInstance;
    const targetDate = over.data.current?.date;

    if (!workoutInstance || !targetDate) {
      setActiveWorkout(null);
      return;
    }

    // Don't update if dropping on same date
    if (workoutInstance.scheduled_date === targetDate) {
      setActiveWorkout(null);
      return;
    }

    // Optimistically update state immediately (no flicker)
    setWorkoutInstances(prevInstances =>
      prevInstances.map(instance =>
        instance.id === workoutInstance.id
          ? { ...instance, scheduled_date: targetDate }
          : instance
      )
    );

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Previous month"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-2xl lg:text-3xl font-bold text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Next month"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all font-medium"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWorkoutDetails(!showWorkoutDetails)}
                className={`px-4 py-2 border text-sm rounded-lg transition-all font-medium flex items-center gap-2 ${
                  showWorkoutDetails
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'
                }`}
                title={showWorkoutDetails ? 'Hide Workout Details' : 'Show Workout Details'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">{showWorkoutDetails ? 'Hide' : 'Show'} Details</span>
              </button>
              <button
                onClick={() => setShowImportPlan(true)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm rounded-lg transition-all font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Import Plan</span>
                <span className="sm:hidden">Import</span>
              </button>
              <div className="text-sm text-neutral-400">
                {workoutInstances.length} workout{workoutInstances.length !== 1 ? 's' : ''} this month
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-center py-3 text-sm font-semibold text-neutral-400 border-r border-neutral-800 last:border-r-0">
                <span className="hidden lg:inline">{day}</span>
                <span className="lg:hidden">{day.slice(0, 3)}</span>
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
                    className="min-h-[120px] bg-neutral-900/30 border-r border-b border-neutral-800"
                  />
                );
              }

              const dateStr = new Date(year, month, day).toISOString().split('T')[0];
              const dayWorkouts = getWorkoutsForDate(dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <CalendarDayCell
                  key={dateStr}
                  date={dateStr}
                  day={day}
                  workouts={dayWorkouts}
                  isToday={isToday}
                  showDetails={showWorkoutDetails}
                  onWorkoutClick={(instance) => setSelectedInstance(instance)}
                  onWorkoutDelete={(id) => handleDeleteWorkout(id)}
                  onCreateWorkout={() => setShowCreateWorkout({ date: dateStr })}
                  onAddWorkout={() => setShowWorkoutLibrary({ date: dateStr })}
                  onAddRoutine={() => setShowRoutineLibrary({ date: dateStr })}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-neutral-400">Workout Categories:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-neutral-300">Hitting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-neutral-300">Throwing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-neutral-300">Strength & Conditioning</span>
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
            planId={null as any}
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
        min-h-[120px] border-r border-b border-neutral-800 p-2 relative transition-all
        ${isOver ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : 'bg-neutral-900/30 hover:bg-neutral-800/30'}
        ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}
      `}
    >
      {/* Day Number and Add Button */}
      <div className="flex items-start justify-between mb-2">
        <div className={`
          text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
          ${isToday ? 'bg-blue-500 text-white' : 'text-neutral-400'}
        `}>
          {day}
        </div>

        {/* Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors"
            title="Add workout or routine"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="space-y-1">
        {workouts.slice(0, 3).map((wi) => (
          wi.workouts && (
            <DraggableWorkoutChip
              key={wi.id}
              workoutInstance={wi}
              showDetails={showDetails}
              onClick={() => onWorkoutClick(wi)}
              onDelete={() => onWorkoutDelete(wi.id)}
            />
          )
        ))}
        {workouts.length > 3 && (
          <div className="text-xs text-neutral-500 text-center py-1">
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
}: {
  workoutInstance: WorkoutInstance;
  showDetails: boolean;
  onClick: () => void;
  onDelete: () => void;
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
        group relative px-2 py-1.5 rounded border cursor-move transition-all text-xs
        ${getCategoryColor(workoutInstance.workouts?.category || null)}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-102 hover:shadow-lg'}
      `}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 cursor-pointer"
        >
          {/* Workout Name and Status */}
          <div className="font-medium line-clamp-1 flex items-center gap-1">
            {getStatusIndicator(workoutInstance.status) && (
              <span className={`
                ${workoutInstance.status === 'completed' ? 'text-green-400' : ''}
                ${workoutInstance.status === 'in_progress' ? 'text-yellow-400' : ''}
                ${workoutInstance.status === 'skipped' ? 'text-red-400' : ''}
              `}>
                {getStatusIndicator(workoutInstance.status)}
              </span>
            )}
            <span className="truncate">{workoutInstance.workouts?.name || 'Workout'}</span>
          </div>

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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/30 rounded transition-all flex-shrink-0"
          title="Delete workout"
        >
          <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
                  className="px-6 py-3 bg-[#C9A857] text-black rounded-lg font-semibold hover:bg-[#B89847] transition-colors"
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
