'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AssignPlanModal } from './assign-plan-modal';

interface CalendarTabProps {
  athleteId: string;
}

interface Workout {
  id: string;
  name: string;
  category: string;
  estimated_duration_minutes: number | null;
  description: string | null;
  plan_id: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  total_weeks: number;
  workouts: any[];
}

interface WorkoutInstance {
  id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
  workouts: {
    id: string;
    name: string;
    category: string;
    estimated_duration_minutes: number | null;
  };
}

export default function AthleteCalendarTab({ athleteId }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [calendarInstances, setCalendarInstances] = useState<{ [key: string]: WorkoutInstance[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['hitting', 'throwing', 'strength_conditioning']);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WorkoutInstance | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // grid = normal calendar, list = month details

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchWorkouts();
    fetchPlans();
    fetchCalendarData();
  }, [athleteId, currentDate]);

  async function fetchWorkouts() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('Workouts loaded:', { count: data?.length, data, error });

    if (data) {
      setWorkouts(data);
    }
  }

  async function fetchPlans() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        workouts (id, name, week_number, day_of_week)
      `)
      .eq('is_template', true);

    console.log('Plans loaded:', { count: data?.length, data, error });

    if (data) {
      setPlans(data);
    }
  }

  async function fetchCalendarData() {
    const supabase = createClient();

    // Get first and last day of month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const monthStart = firstDay.toISOString().split('T')[0];
    const monthEnd = lastDay.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('workout_instances')
      .select(`
        id,
        scheduled_date,
        status,
        completed_at,
        notes,
        workouts (
          id,
          name,
          estimated_duration_minutes
        )
      `)
      .eq('athlete_id', athleteId)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd);

    console.log('Calendar instances loaded:', { count: data?.length, data, error });

    // Group by date
    const grouped: { [key: string]: WorkoutInstance[] } = {};
    if (data) {
      data.forEach((instance: any) => {
        const date = instance.scheduled_date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(instance);
      });
    }

    setCalendarInstances(grouped);
    setLoading(false);
  }

  function handleDragStart(event: DragStartEvent) {
    const workout = event.active.data.current?.workout;
    setActiveWorkout(workout);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveWorkout(null);
      return;
    }

    const supabase = createClient();
    const targetDate = over.data.current?.date;

    // Check if we're dragging a new workout from sidebar or an existing workout chip
    const newWorkout = active.data.current?.workout; // From sidebar
    const existingInstance = active.data.current?.workoutInstance; // From calendar

    if (!targetDate) {
      setActiveWorkout(null);
      return;
    }

    // Scenario 1: Dragging NEW workout from sidebar to calendar
    if (newWorkout && !existingInstance) {
      console.log('Creating new workout instance:', { workout: newWorkout.name, targetDate });

      const { data, error } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: newWorkout.id,
          athlete_id: athleteId,
          scheduled_date: targetDate,
          status: 'not_started',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding workout:', error);
        alert('Failed to add workout: ' + error.message);
      } else {
        console.log('Created instance:', data);
        fetchCalendarData();
      }
    }

    // Scenario 2: Moving EXISTING workout to new date
    else if (existingInstance) {
      console.log('Moving existing workout:', { from: existingInstance.scheduled_date, to: targetDate });

      // Don't update if dropping on the same date
      if (existingInstance.scheduled_date === targetDate) {
        console.log('Dropped on same date, no update needed');
        setActiveWorkout(null);
        return;
      }

      const { error } = await supabase
        .from('workout_instances')
        .update({ scheduled_date: targetDate })
        .eq('id', existingInstance.id);

      if (error) {
        console.error('Error moving workout:', error);
        alert('Failed to move workout: ' + error.message);
      } else {
        console.log('Successfully moved workout to', targetDate);
        fetchCalendarData();
      }
    }

    setActiveWorkout(null);
  }

  function toggleCategoryFilter(category: string) {
    if (categoryFilters.includes(category)) {
      setCategoryFilters(categoryFilters.filter(c => c !== category));
    } else {
      setCategoryFilters([...categoryFilters, category]);
    }
  }

  function getCategoryColor(category: string) {
    const colors: { [key: string]: string } = {
      hitting: 'bg-red-500/20 text-red-300 border-red-500',
      throwing: 'bg-blue-500/20 text-blue-300 border-blue-500',
      strength_conditioning: 'bg-green-500/20 text-green-300 border-green-500',
    };
    return colors[category?.toLowerCase()] || colors.strength_conditioning;
  }

  function getStatusBorderClass(status: string) {
    if (status === 'completed') return 'border-green-500 border-2';
    if (status === 'in_progress') return 'border-blue-500 border-2';
    if (status === 'skipped') return 'border-red-500 border-2';
    return 'border-white/20';
  }

  const filteredWorkouts = workouts.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !w.category || categoryFilters.includes(w.category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* LEFT SIDEBAR */}
        <div className="w-[300px] flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-lg font-bold text-white mb-4">Workout Library</h3>

          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
            />
          </div>

          {/* Category Filters */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Categories</p>
            <div className="space-y-1">
              {[
                { value: 'hitting', label: 'Hitting' },
                { value: 'throwing', label: 'Throwing' },
                { value: 'strength_conditioning', label: 'Strength & Conditioning' }
              ].map(cat => (
                <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFilters.includes(cat.value)}
                    onChange={() => toggleCategoryFilter(cat.value)}
                    className="rounded"
                  />
                  <span className="text-sm text-white">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Workout Cards */}
          <div className="space-y-2 mb-6">
            <p className="text-xs text-gray-400 mb-2">Drag to calendar</p>
            {filteredWorkouts.map(workout => (
              <DraggableWorkoutCard key={workout.id} workout={workout} getCategoryColor={getCategoryColor} />
            ))}
          </div>

          {/* Training Plans */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Training Plans</h4>
            <div className="space-y-3">
              {plans.map(plan => (
                <div key={plan.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <p className="font-medium text-white text-sm mb-1">{plan.name}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    {plan.total_weeks} weeks • {plan.workouts?.length || 0} workouts
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      setAssignPlanModalOpen(true);
                    }}
                    className="w-full px-3 py-1.5 bg-[#C9A857] text-black text-xs font-semibold rounded-lg hover:bg-[#B89647] transition-all"
                  >
                    Assign Full Plan
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
            <button
              onClick={() => alert('Create Workout - Coming soon')}
              className="w-full px-3 py-2 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 transition-all"
            >
              + Create New Workout
            </button>
            <button
              onClick={() => alert('Create Plan - Coming soon')}
              className="w-full px-3 py-2 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 transition-all"
            >
              + Create New Plan
            </button>
          </div>
        </div>

        {/* MAIN CALENDAR AREA */}
        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-6 overflow-y-auto">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-2xl font-bold text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="px-3 py-1.5 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 transition-all"
              >
                Today
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#C9A857] text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#C9A857] text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Month Details
              </button>
            </div>
          </div>

          {/* Calendar Grid or List View */}
          {viewMode === 'grid' ? (
            <CalendarGrid
              currentDate={currentDate}
              calendarInstances={calendarInstances}
              getCategoryColor={getCategoryColor}
              getStatusBorderClass={getStatusBorderClass}
              onWorkoutClick={(instance) => {
                setSelectedInstance(instance);
                setDrawerOpen(true);
              }}
            />
          ) : (
            <MonthDetailsView
              currentDate={currentDate}
              calendarInstances={calendarInstances}
              getStatusBorderClass={getStatusBorderClass}
              onWorkoutClick={(instance) => {
                setSelectedInstance(instance);
                setDrawerOpen(true);
              }}
            />
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-400">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-400">Hitting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-400">Throwing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-400">Strength & Conditioning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeWorkout ? (
          <div className="rounded-lg bg-white/10 p-3 opacity-80 border border-white/20">
            <p className="font-medium text-white text-sm">{activeWorkout.name}</p>
          </div>
        ) : null}
      </DragOverlay>

      {/* Bottom Drawer */}
      {drawerOpen && selectedInstance && (
        <WorkoutDrawer
          instance={selectedInstance}
          athleteId={athleteId}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedInstance(null);
          }}
          onUpdate={() => {
            fetchCalendarData();
          }}
          getCategoryColor={getCategoryColor}
          getStatusBorderClass={getStatusBorderClass}
        />
      )}

      {/* Assign Plan Modal */}
      {assignPlanModalOpen && selectedPlan && (
        <AssignPlanModal
          planId={selectedPlan}
          athleteId={athleteId}
          onSuccess={() => {
            fetchCalendarData();
            setAssignPlanModalOpen(false);
            setSelectedPlan(null);
          }}
          onClose={() => {
            setAssignPlanModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </DndContext>
  );
}

// Draggable Workout Card Component
function DraggableWorkoutCard({ workout, getCategoryColor }: { workout: Workout; getCategoryColor: (cat: string) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { workout },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing rounded-lg bg-white/5 p-3 border border-white/10 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(workout.category || 'assessment')}`}>
          {workout.category || 'General'}
        </span>
      </div>
      <p className="font-medium text-white text-sm">{workout.name}</p>
      <p className="text-xs text-gray-400 mt-1">
        {workout.estimated_duration_minutes ? `${workout.estimated_duration_minutes} min` : 'Duration varies'}
      </p>
    </div>
  );
}

// Calendar Grid Component
function CalendarGrid({
  currentDate,
  calendarInstances,
  getCategoryColor,
  getStatusBorderClass,
  onWorkoutClick,
}: {
  currentDate: Date;
  calendarInstances: { [key: string]: WorkoutInstance[] };
  getCategoryColor: (cat: string) => string;
  getStatusBorderClass: (status: string) => string;
  onWorkoutClick: (instance: WorkoutInstance) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Generate calendar days
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null); // Empty cells before month starts
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
          {day}
        </div>
      ))}

      {/* Calendar cells */}
      {days.map((day, idx) => {
        if (day === null) {
          return <div key={`empty-${idx}`} className="min-h-[100px] bg-white/[0.01]"></div>;
        }

        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        const workouts = calendarInstances[dateStr] || [];
        const isToday = dateStr === new Date().toISOString().split('T')[0];

        return (
          <DroppableCalendarDay
            key={dateStr}
            date={dateStr}
            day={day}
            workouts={workouts}
            isToday={isToday}
            getCategoryColor={getCategoryColor}
            getStatusBorderClass={getStatusBorderClass}
            onWorkoutClick={onWorkoutClick}
          />
        );
      })}
    </div>
  );
}

// Draggable Workout Chip Component (for existing workouts on calendar)
function DraggableWorkoutChip({
  workout,
  onWorkoutClick,
  getStatusBorderClass,
}: {
  workout: WorkoutInstance;
  onWorkoutClick: (instance: WorkoutInstance) => void;
  getStatusBorderClass: (status: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `instance-${workout.id}`,
    data: { workoutInstance: workout },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging) {
          onWorkoutClick(workout);
        }
      }}
      className={`
        w-full px-2 py-1 rounded text-xs font-medium text-left border transition-all
        bg-blue-500/20 text-blue-300 border-blue-500
        ${getStatusBorderClass(workout.status)}
        hover:scale-105 hover:shadow-lg cursor-move
      `}
    >
      <div className="truncate">{workout.workouts?.name || 'Workout'}</div>
    </button>
  );
}

// Droppable Calendar Day Component
function DroppableCalendarDay({
  date,
  day,
  workouts,
  isToday,
  getCategoryColor,
  getStatusBorderClass,
  onWorkoutClick,
}: {
  date: string;
  day: number;
  workouts: WorkoutInstance[];
  isToday: boolean;
  getCategoryColor: (cat: string) => string;
  getStatusBorderClass: (status: string) => string;
  onWorkoutClick: (instance: WorkoutInstance) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[100px] border rounded-lg p-2 relative transition-all
        ${isOver ? 'bg-blue-500/20 ring-2 ring-blue-500' : 'bg-white/5'}
        ${isToday ? 'ring-2 ring-[#C9A857]' : 'border-white/10'}
      `}
    >
      <div className={`text-sm font-semibold ${isToday ? 'text-[#C9A857]' : 'text-gray-400'}`}>
        {day}
      </div>

      <div className="space-y-1 mt-2">
        {workouts.slice(0, 3).map((workout) => (
          <DraggableWorkoutChip
            key={workout.id}
            workout={workout}
            onWorkoutClick={onWorkoutClick}
            getStatusBorderClass={getStatusBorderClass}
          />
        ))}
        {workouts.length > 3 && (
          <div className="text-xs text-gray-400 text-center">+{workouts.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

// Workout Drawer Component
function WorkoutDrawer({
  instance,
  athleteId,
  onClose,
  onUpdate,
  getCategoryColor,
  getStatusBorderClass,
}: {
  instance: WorkoutInstance;
  athleteId: string;
  onClose: () => void;
  onUpdate: () => void;
  getCategoryColor: (cat: string) => string;
  getStatusBorderClass: (status: string) => string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this workout from the schedule?')) return;

    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('workout_instances')
      .delete()
      .eq('id', instance.id);

    if (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    } else {
      onUpdate();
      onClose();
    }

    setDeleting(false);
  }

  async function toggleStatus() {
    setToggling(true);
    const supabase = createClient();

    const newStatus = instance.status === 'completed' ? 'not_started' : 'completed';
    const completed_at = newStatus === 'completed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('workout_instances')
      .update({
        status: newStatus,
        completed_at,
      })
      .eq('id', instance.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } else {
      onUpdate();
      onClose();
    }

    setToggling(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0A0A0A] border-t border-white/10 rounded-t-2xl p-6 shadow-2xl animate-slide-up">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold text-white">{instance.workouts?.name || 'Workout'}</h3>
              <span className={`px-3 py-1 rounded-md text-sm font-medium border ${getStatusBorderClass(instance.status)}`}>
                {instance.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-400">
              {new Date(instance.scheduled_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Duration</p>
            <p className="text-white font-medium">
              {instance.workouts?.estimated_duration_minutes ? `${instance.workouts.estimated_duration_minutes} min` : 'Not specified'}
            </p>
          </div>
          {instance.completed_at && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Completed</p>
              <p className="text-white font-medium">
                {new Date(instance.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {instance.notes && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Notes</p>
            <p className="text-white bg-white/5 rounded-lg p-3">{instance.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              instance.status === 'completed'
                ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
            }`}
          >
            {toggling ? 'Updating...' : instance.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
          </button>

          <button
            onClick={() => alert('Edit workout - Coming soon')}
            className="px-4 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
          >
            Edit
          </button>

          <button
            onClick={() => alert('Duplicate - Coming soon')}
            className="px-4 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
          >
            Duplicate
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Month Details View Component (List View)
function MonthDetailsView({
  currentDate,
  calendarInstances,
  getStatusBorderClass,
  onWorkoutClick,
}: {
  currentDate: Date;
  calendarInstances: { [key: string]: WorkoutInstance[] };
  getStatusBorderClass: (status: string) => string;
  onWorkoutClick: (instance: WorkoutInstance) => void;
}) {
  // Get all days in the month with workouts
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create array of all days
  const allDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const workouts = calendarInstances[dateStr] || [];
    if (workouts.length > 0) {
      allDays.push({ date: dateStr, day, workouts });
    }
  }

  return (
    <div className="space-y-4">
      {allDays.length > 0 ? (
        allDays.map(({ date, day, workouts }) => (
          <div key={date} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <span className="text-sm text-gray-400">{workouts.length} workout{workouts.length > 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {workouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => onWorkoutClick(workout)}
                  className={`
                    w-full text-left p-4 rounded-lg border transition-all
                    bg-white/5 hover:bg-white/10
                    ${getStatusBorderClass(workout.status)}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{workout.workouts?.name || 'Workout'}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        {workout.workouts?.estimated_duration_minutes && (
                          <span>⏱️ {workout.workouts.estimated_duration_minutes} min</span>
                        )}
                        {workout.completed_at && (
                          <span>✅ Completed {new Date(workout.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        )}
                        {workout.notes && (
                          <span>📝 Has notes</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      workout.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : workout.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-400'
                        : workout.status === 'skipped'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {workout.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No workouts scheduled for this month</p>
        </div>
      )}
    </div>
  );
}
