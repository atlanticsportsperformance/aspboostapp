'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AddWorkoutToPlanDialog from '@/components/dashboard/plans/add-workout-to-plan-dialog';
import AddRoutineToPlanDialog from '@/components/dashboard/plans/add-routine-to-plan-dialog';
import WorkoutDetailSlideover from '@/components/dashboard/plans/workout-detail-slideover';
import { CreateWorkoutInPlanModal } from '@/components/dashboard/plans/create-workout-in-plan-modal';
import { WorkoutBuilderModal } from '@/components/dashboard/plans/workout-builder-modal';
import PlanTagsEditor from '@/components/dashboard/plans/plan-tags-editor';
import { AssignPlanDialog } from '@/components/dashboard/plans/assign-plan-dialog';
import { DraggableWorkoutCard } from '@/components/dashboard/plans/draggable-workout-card';
import { DroppableDayCell } from '@/components/dashboard/plans/droppable-day-cell';
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

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  plan_id: string | null;
  athlete_id: string | null;
}

interface ProgramDay {
  id: string;
  plan_id: string;
  week_number: number;
  day_number: number;
  workout_id: string | null;
  order_index: number;
  workouts: Workout | null;
}

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  program_length_weeks: number;
}

export default function PlanCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const planId = params.id as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState<{ week: number; day: number } | null>(null);
  const [showRoutineLibrary, setShowRoutineLibrary] = useState<{ week: number; day: number } | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<{ workout: Workout; week: number; day: number } | null>(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState<{ week: number; day: number } | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ProgramDay | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (plan) {
      fetchProgramDays();
    }
  }, [plan]);

  async function fetchPlan() {
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching plan:', error);
      alert('Failed to load plan');
      router.push('/dashboard/plans');
    } else {
      setPlan(data);
    }
    setLoading(false);
  }

  async function fetchProgramDays() {
    // Fetch ALL program days for the entire plan
    const { data, error } = await supabase
      .from('program_days')
      .select(`
        *,
        workouts (id, name, category, estimated_duration_minutes, notes, plan_id)
      `)
      .eq('plan_id', planId)
      .order('week_number')
      .order('day_number');

    if (error) {
      console.error('Error fetching program days:', error);
    } else {
      setProgramDays(data || []);
    }
  }

  function getWorkoutsForDay(weekNumber: number, dayNumber: number): ProgramDay[] {
    return programDays.filter(pd => pd.week_number === weekNumber && pd.day_number === dayNumber);
  }

  function getTotalWorkouts(): number {
    return programDays.filter(pd => pd.workout_id !== null).length;
  }

  async function handleAddWeek() {
    if (!plan) return;

    const newWeekCount = plan.program_length_weeks + 1;

    // Update plan length
    const { error: planError } = await supabase
      .from('training_plans')
      .update({ program_length_weeks: newWeekCount })
      .eq('id', planId);

    if (planError) {
      console.error('Error updating plan length:', planError);
      alert('Failed to add week');
      return;
    }

    // Initialize the new week's structure
    const { error: initError } = await supabase.rpc('initialize_program_structure', {
      p_plan_id: planId,
      p_weeks: newWeekCount
    });

    if (initError) {
      console.error('Error initializing new week:', initError);
    }

    // Refresh data
    await fetchPlan();
    await fetchProgramDays();
  }

  async function handleDeleteWeek(weekNumber: number) {
    if (!plan) return;

    // Check if week has any workouts
    const weekWorkouts = programDays.filter(pd => pd.week_number === weekNumber && pd.workout_id !== null);

    if (weekWorkouts.length > 0) {
      if (!confirm(`Week ${weekNumber} contains ${weekWorkouts.length} workout(s). Delete this week and all its workouts? This cannot be undone.`)) {
        return;
      }
    } else {
      if (!confirm(`Delete Week ${weekNumber}? This cannot be undone.`)) {
        return;
      }
    }

    // Step 1: Delete all program_days for this week
    const { error: deleteError } = await supabase
      .from('program_days')
      .delete()
      .eq('plan_id', planId)
      .eq('week_number', weekNumber);

    if (deleteError) {
      console.error('Error deleting week:', deleteError);
      alert('Failed to delete week');
      return;
    }

    // Step 2: Shift all subsequent weeks down by 1
    const subsequentWeeks = programDays.filter(pd => pd.week_number > weekNumber);

    for (const day of subsequentWeeks) {
      await supabase
        .from('program_days')
        .update({ week_number: day.week_number - 1 })
        .eq('id', day.id);
    }

    // Step 3: Update plan length
    const newWeekCount = plan.program_length_weeks - 1;
    const { error: planError } = await supabase
      .from('training_plans')
      .update({ program_length_weeks: newWeekCount })
      .eq('id', planId);

    if (planError) {
      console.error('Error updating plan length:', planError);
    }

    // Refresh data
    await fetchPlan();
    await fetchProgramDays();
  }

  async function handleDeleteWorkout(programDayId: string, workoutId: string) {
    if (!confirm('Delete this workout from the plan? This cannot be undone.')) {
      return;
    }

    // Step 1: Unlink from program_days
    await supabase.from('program_days').delete().eq('id', programDayId);

    // Step 2: Delete the workout (CASCADE deletes routines/exercises)
    await supabase.from('workouts').delete().eq('id', workoutId);

    // Refresh
    await fetchProgramDays();
  }

  async function handleDuplicateWorkout(programDayId: string, workoutId: string) {
    // Fetch full workout with routines and exercises
    const { data: fullWorkout, error } = await supabase
      .from('workouts')
      .select(`
        *,
        routines (
          *,
          routine_exercises (*)
        )
      `)
      .eq('id', workoutId)
      .single();

    if (error || !fullWorkout) {
      alert('Failed to load workout');
      return;
    }

    // Create duplicate workout
    const { data: newWorkout } = await supabase
      .from('workouts')
      .insert({
        name: fullWorkout.name + ' (Copy)',
        category: fullWorkout.category,
        estimated_duration_minutes: fullWorkout.estimated_duration_minutes,
        notes: fullWorkout.notes,
        tags: fullWorkout.tags,
        is_template: false,
        plan_id: planId,
        athlete_id: null,
        placeholder_definitions: fullWorkout.placeholder_definitions
      })
      .select()
      .single();

    if (!newWorkout) {
      alert('Failed to create duplicate');
      return;
    }

    // Copy routines
    for (const routine of fullWorkout.routines || []) {
      const { data: newRoutine } = await supabase
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
          plan_id: planId,
          athlete_id: null
        })
        .select()
        .single();

      if (!newRoutine) continue;

      // Copy exercises
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

      if (exercisesToCopy.length > 0) {
        await supabase.from('routine_exercises').insert(exercisesToCopy);
      }
    }

    // Get the original program_day to find same day
    const { data: originalPd } = await supabase
      .from('program_days')
      .select('week_number, day_number')
      .eq('id', programDayId)
      .single();

    if (originalPd) {
      // Add to same day
      await supabase.from('program_days').insert({
        plan_id: planId,
        week_number: originalPd.week_number,
        day_number: originalPd.day_number,
        workout_id: newWorkout.id,
        order_index: 0
      });
    }

    // Refresh
    await fetchProgramDays();
  }

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500',
      throwing: 'bg-blue-500',
      strength_conditioning: 'bg-green-500',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-neutral-500';
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const programDay = programDays.find(pd => pd.id === active.id);
    if (programDay) {
      setActiveWorkout(programDay);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveWorkout(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Parse the droppable ID: format is "day-{week}-{day}"
    const overId = over.id as string;
    if (!overId.startsWith('day-')) {
      return;
    }

    const [, weekStr, dayStr] = overId.split('-');
    const targetWeek = parseInt(weekStr);
    const targetDay = parseInt(dayStr);

    // Find the program day being dragged
    const programDay = programDays.find(pd => pd.id === active.id);
    if (!programDay || !programDay.workout_id) {
      return;
    }

    // If moving to same location, do nothing
    if (programDay.week_number === targetWeek && programDay.day_number === targetDay) {
      return;
    }

    console.log(`Moving workout from Week ${programDay.week_number}, Day ${programDay.day_number} to Week ${targetWeek}, Day ${targetDay}`);

    // Update the program_day record
    const { error } = await supabase
      .from('program_days')
      .update({
        week_number: targetWeek,
        day_number: targetDay
      })
      .eq('id', programDay.id);

    if (error) {
      console.error('Error moving workout:', error);
      alert('Failed to move workout');
    } else {
      // Refresh the calendar
      await fetchProgramDays();
    }
  }

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading plan...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-black/30 backdrop-blur-sm">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard/plans"
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm lg:text-base"
            >
              <span>←</span> <span className="hidden sm:inline">Back to Plans</span><span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => setShowAssignDialog(true)}
                className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs lg:text-sm font-semibold transition-all"
              >
                <span className="hidden sm:inline">📋 Assign to Athletes</span>
                <span className="sm:hidden">📋</span>
              </button>
            </div>
          </div>

          {/* Plan Name & Description */}
          <div className="space-y-2">
            <input
              type="text"
              value={plan.name}
              onChange={(e) => setPlan({ ...plan, name: e.target.value })}
              onBlur={async () => {
                await supabase
                  .from('training_plans')
                  .update({ name: plan.name })
                  .eq('id', planId);
              }}
              className="text-xl lg:text-2xl font-bold text-white mb-2 bg-transparent border-b border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 outline-none transition-colors pb-1 w-full"
              placeholder="Plan name..."
            />
            <textarea
              value={plan.description || ''}
              onChange={(e) => setPlan({ ...plan, description: e.target.value })}
              onBlur={async () => {
                await supabase
                  .from('training_plans')
                  .update({ description: plan.description })
                  .eq('id', planId);
              }}
              className="text-neutral-400 text-xs lg:text-sm bg-transparent border border-neutral-700 hover:border-neutral-500 focus:border-neutral-400 outline-none transition-colors p-2 rounded w-full resize-none"
              placeholder="Add plan description..."
              rows={2}
            />
            <PlanTagsEditor
              tags={plan.tags || []}
              onUpdate={async (newTags) => {
                try {
                  // Update in database first
                  const { data, error } = await supabase
                    .from('training_plans')
                    .update({ tags: newTags })
                    .eq('id', planId)
                    .select()
                    .single();

                  if (error) {
                    console.error('Failed to update plan tags:', error);
                    alert('Failed to save tags: ' + (error.message || 'Unknown error'));
                    return;
                  }

                  // Update local state with confirmed data
                  if (data) {
                    setPlan(data);
                  }
                } catch (err) {
                  console.error('Exception updating tags:', err);
                  alert('Failed to save tags');
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Program Stats */}
      <div className="border-b border-neutral-800 bg-black/20 backdrop-blur-sm px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="text-xs lg:text-sm text-neutral-400">
            {plan.program_length_weeks} week program • {getTotalWorkouts()} total workouts
          </div>
        </div>
      </div>

      {/* Full Program Grid - All Weeks */}
      <div className="flex-1 overflow-auto p-2 lg:p-4">
        <div className="space-y-3">
          {Array.from({ length: plan.program_length_weeks }, (_, weekIndex) => {
            const weekNumber = weekIndex + 1;
            const weekWorkoutCount = programDays.filter(
              pd => pd.week_number === weekNumber && pd.workout_id !== null
            ).length;

            return (
              <div key={weekNumber} className="space-y-1.5">
                {/* Week Header */}
                <div className="flex items-center justify-between gap-2 lg:gap-3 px-1 lg:px-2 py-1">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <h2 className="text-xs lg:text-sm font-bold text-white">
                      Week {weekNumber}
                    </h2>
                    <span className="text-[10px] lg:text-xs text-neutral-500">
                      {weekWorkoutCount} {weekWorkoutCount === 1 ? 'workout' : 'workouts'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteWeek(weekNumber)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    title="Delete Week"
                  >
                    Delete Week
                  </button>
                </div>

                {/* Week Grid - Horizontal scroll on mobile, full grid on desktop */}
                <div className="lg:grid lg:grid-cols-7 lg:gap-1.5 flex overflow-x-auto gap-2 lg:overflow-x-visible snap-x snap-mandatory lg:snap-none pb-2 lg:pb-0">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
                    const dayWorkouts = getWorkoutsForDay(weekNumber, dayNumber);

                    return (
                      <DroppableDayCell
                        key={dayNumber}
                        weekNumber={weekNumber}
                        dayNumber={dayNumber}
                        dayName={dayNames[dayNumber - 1]}
                        onCreateWorkout={() => setShowCreateWorkout({ week: weekNumber, day: dayNumber })}
                        onCopyWorkout={() => setShowWorkoutLibrary({ week: weekNumber, day: dayNumber })}
                        onAddRoutine={() => setShowRoutineLibrary({ week: weekNumber, day: dayNumber })}
                      >
                        {/* Workouts for this day */}
                        <div className="space-y-1">
                          {dayWorkouts.map((pd) => (
                            pd.workouts && (
                              <DraggableWorkoutCard
                                key={pd.id}
                                programDayId={pd.id}
                                workout={pd.workouts}
                                onClick={() => setEditingWorkoutId(pd.workouts!.id)}
                                onDelete={() => handleDeleteWorkout(pd.id, pd.workouts!.id)}
                                onDuplicate={() => handleDuplicateWorkout(pd.id, pd.workouts!.id)}
                              />
                            )
                          ))}
                        </div>
                      </DroppableDayCell>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Week Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleAddWeek}
              className="px-6 py-3 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 hover:border-neutral-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Week
            </button>
          </div>
        </div>
      </div>

      {/* Workout Library Modal */}
      {showWorkoutLibrary && plan && (
        <AddWorkoutToPlanDialog
          planId={planId}
          programLengthWeeks={plan.program_length_weeks}
          weekNumber={showWorkoutLibrary.week}
          dayNumber={showWorkoutLibrary.day}
          onClose={() => setShowWorkoutLibrary(null)}
          onSuccess={() => {
            setShowWorkoutLibrary(null);
            fetchProgramDays();
          }}
        />
      )}

      {/* Workout Detail Slide-over */}
      {selectedWorkout && (
        <WorkoutDetailSlideover
          workout={selectedWorkout.workout}
          weekNumber={selectedWorkout.week}
          dayNumber={selectedWorkout.day}
          onClose={() => setSelectedWorkout(null)}
          onUpdate={() => {
            setSelectedWorkout(null);
            fetchProgramDays();
          }}
        />
      )}

      {/* Create Workout Modal */}
      {showCreateWorkout && (
        <CreateWorkoutInPlanModal
          planId={planId}
          weekNumber={showCreateWorkout.week}
          dayNumber={showCreateWorkout.day}
          onClose={() => setShowCreateWorkout(null)}
          onSuccess={(workoutId) => {
            setShowCreateWorkout(null);
            fetchProgramDays();
            setEditingWorkoutId(workoutId); // Open the builder modal
          }}
        />
      )}

      {/* Routine Library Dialog */}
      {showRoutineLibrary && (
        <AddRoutineToPlanDialog
          planId={planId}
          weekNumber={showRoutineLibrary.week}
          dayNumber={showRoutineLibrary.day}
          onClose={() => setShowRoutineLibrary(null)}
          onSuccess={() => {
            setShowRoutineLibrary(null);
            fetchProgramDays();
          }}
        />
      )}

      {/* Workout Builder Modal */}
      {editingWorkoutId && (
        <WorkoutBuilderModal
          workoutId={editingWorkoutId}
          planId={planId}
          onClose={() => setEditingWorkoutId(null)}
          onSaved={() => {
            fetchProgramDays(); // Refresh the calendar
          }}
        />
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeWorkout && activeWorkout.workouts ? (
          <div className={`p-2 rounded shadow-2xl border-l-4 opacity-90 ${
            activeWorkout.workouts.category === 'hitting'
              ? 'bg-red-500/20 border-red-500'
              : activeWorkout.workouts.category === 'throwing'
              ? 'bg-blue-500/20 border-blue-500'
              : 'bg-green-500/20 border-green-500'
          }`}>
            <div className="text-[11px] font-medium text-white">
              {activeWorkout.workouts.name}
            </div>
            {activeWorkout.workouts.estimated_duration_minutes && (
              <div className="text-[9px] text-neutral-400 mt-0.5">
                {activeWorkout.workouts.estimated_duration_minutes}min
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>

      {/* Assign Plan Dialog */}
      {showAssignDialog && plan && (
        <AssignPlanDialog
          plan={{
            id: plan.id,
            name: plan.name,
            program_length_weeks: plan.program_length_weeks
          }}
          onClose={() => setShowAssignDialog(false)}
        />
      )}
    </div>
    </DndContext>
  );
}
