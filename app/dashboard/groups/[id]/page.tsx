'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  Settings,
  ArrowLeft,
  Trash2,
  UserPlus,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Library,
  ClipboardList,
  Dumbbell,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AddWorkoutToGroupModal } from '@/components/dashboard/groups/add-workout-to-group-modal';
import { AddRoutineToGroupModal } from '@/components/dashboard/groups/add-routine-to-group-modal';
import { AssignPlanToGroupModal } from '@/components/dashboard/groups/assign-plan-to-group-modal';
import { WorkoutBuilderModal } from '@/components/dashboard/plans/workout-builder-modal';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface Athlete {
  id: string;
  user_id: string | null;
  profile?: Profile;
}

interface GroupMember {
  id: string;
  athlete_id: string;
  role: string;
  joined_at: string;
  athlete?: Athlete;
}

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
  group_id: string | null;
}

interface GroupWorkoutSchedule {
  id: string;
  workout_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string | null;
  auto_assign: boolean;
  workout?: Workout;
  synced_count?: number;
  detached_count?: number;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

function getCategoryColor(category: string | null) {
  switch (category?.toLowerCase()) {
    case 'hitting':
      return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'throwing':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    case 'strength_conditioning':
      return 'bg-green-500/10 border-green-500/30 text-green-400';
    default:
      return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
  }
}

function formatCategory(category: string | null) {
  if (!category) return 'General';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' & ');
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<GroupWorkoutSchedule[]>([]);
  const [currentView, setCurrentView] = useState<'calendar' | 'members' | 'staff'>('calendar');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showScheduleWorkoutModal, setShowScheduleWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<GroupWorkoutSchedule | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Action modals
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [showCreateWorkoutModal, setShowCreateWorkoutModal] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  // Workout details visibility
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(true);

  // Clone modal state
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSchedule, setCloneSchedule] = useState<GroupWorkoutSchedule | null>(null);
  const [cloneDate, setCloneDate] = useState('');

  const supabase = createClient();

  const sensors = useSensors(
    // Mouse sensor for desktop - no activation constraint for easy dragging
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Small distance to prevent accidental drags on click
      },
    }),
    // Touch sensor for mobile - stricter constraint to prevent accidental drags
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 15,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && groupId) {
      fetchGroupDetails();
    }
  }, [mounted, groupId, currentMonth]);

  async function fetchGroupDetails() {
    setLoading(true);

    // Fetch group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      console.error('Error fetching group:', groupError);
      setLoading(false);
      return;
    }

    setGroup(groupData);

    // Fetch members with athlete and profile data
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select(`
        *,
        athlete:athletes(
          id,
          user_id,
          profile:profiles(id, first_name, last_name, email)
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false });

    if (membersError) {
      console.error('Error fetching members:', membersError);
    } else {
      setMembers(membersData || []);
    }

    // Fetch staff members
    const { data: staffData, error: staffError } = await supabase
      .from('staff_groups')
      .select(`
        *,
        staff:profiles!staff_groups_staff_id_fkey(id, first_name, last_name, email, app_role)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
    } else {
      setStaff(staffData || []);
    }

    // Fetch workout schedules for current month
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = lastDay.toISOString().split('T')[0];

    const { data: schedulesData, error: schedulesError } = await supabase
      .from('group_workout_schedules')
      .select('*')
      .eq('group_id', groupId)
      .gte('scheduled_date', startStr)
      .lte('scheduled_date', endStr)
      .order('scheduled_date', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      setSchedules([]);
    } else {
      // Fetch workout details and sync counts for each schedule
      const enrichedSchedules = await Promise.all(
        (schedulesData || []).map(async (schedule) => {
          // Fetch workout details with routines and exercises (same structure as athlete calendar)
          const { data: workout } = await supabase
            .from('workouts')
            .select(`
              id,
              name,
              category,
              estimated_duration_minutes,
              notes,
              group_id,
              routines (
                id,
                name,
                scheme,
                order_index,
                routine_exercises (
                  id,
                  order_index,
                  sets,
                  metric_targets,
                  set_configurations,
                  intensity_targets,
                  is_amrap,
                  notes,
                  exercises (
                    id,
                    name
                  )
                )
              )
            `)
            .eq('id', schedule.workout_id)
            .single();

          // Fetch sync counts
          const { data: instances } = await supabase
            .from('workout_instances')
            .select('is_synced_with_group')
            .eq('source_type', 'group')
            .eq('source_id', schedule.id);

          const synced_count = instances?.filter(i => i.is_synced_with_group).length || 0;
          const detached_count = instances?.filter(i => !i.is_synced_with_group).length || 0;

          return {
            ...schedule,
            workout,
            synced_count,
            detached_count
          };
        })
      );

      setSchedules(enrichedSchedules);
    }

    setLoading(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remove this member from the group? Their existing group workouts will be detached.')) return;

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
      return;
    }

    fetchGroupDetails();
  }

  async function handleRemoveStaff(staffGroupId: string) {
    if (!confirm('Remove this staff member from the group?')) return;

    const { error } = await supabase
      .from('staff_groups')
      .delete()
      .eq('id', staffGroupId);

    if (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
      return;
    }

    fetchGroupDetails();
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Delete this scheduled workout? Synced athlete instances will be removed.')) return;

    const { error } = await supabase
      .from('group_workout_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
      return;
    }

    fetchGroupDetails();
  }

  function handleEditWorkout(workoutId: string) {
    setEditingWorkoutId(workoutId);
  }

  function handleCloneWorkout(scheduleId: string) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule || !schedule.workout_id) {
      alert('Could not find workout to clone');
      return;
    }

    // Open modal with schedule data
    setCloneSchedule(schedule);
    setCloneDate(schedule.scheduled_date);
    setShowCloneModal(true);
  }

  async function confirmCloneWorkout() {
    if (!cloneSchedule || !cloneDate) return;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(cloneDate)) {
      alert('Invalid date format. Please use YYYY-MM-DD');
      return;
    }

    // Create new schedule with same workout
    const { data, error } = await supabase
      .from('group_workout_schedules')
      .insert({
        group_id: groupId,
        workout_id: cloneSchedule.workout_id,
        scheduled_date: cloneDate,
        scheduled_time: cloneSchedule.scheduled_time,
        notes: cloneSchedule.notes,
        auto_assign: cloneSchedule.auto_assign
      })
      .select()
      .single();

    if (error) {
      console.error('Error cloning workout:', error);
      alert('Failed to clone workout');
      return;
    }

    console.log('✅ Cloned workout schedule:', data);
    console.log('✅ Database trigger should auto-create workout instances for group members');

    // Close modal and refresh
    setShowCloneModal(false);
    setCloneSchedule(null);
    setCloneDate('');
    fetchGroupDetails();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveSchedule(null);
      return;
    }

    const scheduleId = active.id as string;
    const newDate = over.id as string;

    // Find the schedule
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      setActiveSchedule(null);
      return;
    }

    // Update the schedule date
    const { error } = await supabase
      .from('group_workout_schedules')
      .update({ scheduled_date: newDate })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to move workout');
    } else {
      console.log('✅ Updated group schedule, now syncing to athlete calendars...');

      // SYNC TO ATHLETES: Update all workout_instances for this group workout
      const { error: syncError } = await supabase
        .from('workout_instances')
        .update({ scheduled_date: newDate })
        .eq('source_type', 'group')
        .eq('source_id', scheduleId)
        .in('status', ['not_started', 'in_progress']);

      if (syncError) {
        console.error('Error syncing to athletes:', syncError);
        alert('Group workout moved but failed to sync to some athletes');
      } else {
        console.log('✅ Successfully synced workout to all athletes!');
      }

      // Refresh to show updated sync status
      fetchGroupDetails();
    }

    setActiveSchedule(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const scheduleId = event.active.id as string;
    const schedule = schedules.find(s => s.id === scheduleId);
    setActiveSchedule(schedule || null);
  }

  // Calendar helpers
  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add the actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }

  function getSchedulesForDate(date: Date): GroupWorkoutSchedule[] {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.scheduled_date === dateStr);
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function getAthleteDisplayName(member: GroupMember): string {
    if (member.athlete?.profile) {
      const { first_name, last_name } = member.athlete.profile;
      if (first_name && last_name) return `${first_name} ${last_name}`;
      if (first_name) return first_name;
      if (last_name) return last_name;
    }
    return member.athlete?.profile?.email || 'Unknown';
  }

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#9BDDFF]"></div>
          <p className="mt-2 text-gray-400">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Group not found</h2>
          <Link href="/dashboard/groups" className="text-[#9BDDFF] hover:underline mt-2 inline-block">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/groups"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Groups
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: group.color + '20',
                  borderColor: group.color + '40'
                }}
              >
                <Users size={32} style={{ color: group.color }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{group.name}</h1>
                {group.description && (
                  <p className="text-gray-400 mt-1">{group.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{members.length} members</p>
              </div>
            </div>
            <Link
              href={`/dashboard/groups/${groupId}/settings`}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Settings size={24} />
            </Link>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setCurrentView('calendar')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'calendar'
                ? 'text-[#9BDDFF] border-b-2 border-[#9BDDFF]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} />
              Calendar
            </div>
          </button>
          <button
            onClick={() => setCurrentView('members')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'members'
                ? 'text-[#9BDDFF] border-b-2 border-[#9BDDFF]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Athletes ({members.length})
            </div>
          </button>
          <button
            onClick={() => setCurrentView('staff')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentView === 'staff'
                ? 'text-[#9BDDFF] border-b-2 border-[#9BDDFF]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Staff ({staff.length})
            </div>
          </button>
        </div>

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div>
              {/* Calendar Header - Single Row */}
              <div className="flex items-center justify-between mb-4 gap-2 md:gap-4">
                {/* Left: Month Navigation */}
                <div className="flex items-center gap-2 md:gap-4">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                  >
                    <ChevronLeft size={20} className="text-white" />
                  </button>

                  <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white">
                    <span className="md:hidden">{currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span className="hidden md:inline">{formatDate(currentMonth)}</span>
                  </h2>

                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                  >
                    <ChevronRight size={20} className="text-white" />
                  </button>

                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm rounded-lg transition-all font-medium touch-manipulation"
                  >
                    Today
                  </button>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
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
                    onClick={() => {
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                      setShowCreateWorkoutModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black text-xs md:text-sm rounded-lg transition-colors font-medium touch-manipulation"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Create</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                      setShowAddWorkoutModal(true);
                    }}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs md:text-sm rounded-lg transition-colors font-medium touch-manipulation"
                  >
                    <Library size={18} />
                    <span>Workout</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                      setShowAddRoutineModal(true);
                    }}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs md:text-sm rounded-lg transition-colors font-medium touch-manipulation"
                  >
                    <Dumbbell size={18} />
                    <span>Routine</span>
                  </button>
                  <button
                    onClick={() => setShowAssignPlanModal(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs md:text-sm rounded-lg transition-colors font-medium touch-manipulation"
                  >
                    <ClipboardList size={18} />
                    <span>Plan</span>
                  </button>
                </div>
              </div>

              {/* Calendar Grid - Mobile horizontal scroll, desktop normal */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] md:min-w-0">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-2 text-center text-sm font-semibold text-gray-400">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7">
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    if (!day) {
                      return <DroppableDay key={`empty-${index}`} date={null} groupColor={group.color} showDetails={showWorkoutDetails} />;
                    }

                    const daySchedules = getSchedulesForDate(day);
                    const today = isToday(day);

                    return (
                      <DroppableDay
                        key={day.toISOString()}
                        date={day}
                        groupColor={group.color}
                        isToday={today}
                        schedules={daySchedules}
                        showDetails={showWorkoutDetails}
                        onDeleteSchedule={handleDeleteSchedule}
                        onEditSchedule={handleEditWorkout}
                        onCloneSchedule={handleCloneWorkout}
                        onClickDate={(dateStr) => {
                          setSelectedDate(dateStr);
                          setShowCreateWorkoutModal(true);
                        }}
                      />
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DragOverlay>
              {activeSchedule && (
                <div className="bg-white/10 border border-white/20 rounded-lg p-2 text-white text-xs shadow-lg">
                  {activeSchedule.workout?.name || 'Workout'}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Members View */}
        {currentView === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Group Members</h2>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
              >
                <Plus size={18} />
                Add Member
              </button>
            </div>

            {members.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <Users className="mx-auto text-gray-500 mb-2" size={48} />
                <p className="text-gray-400">No members in this group yet</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
                >
                  Add First Member
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
                {members.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#9BDDFF]/10 border border-[#9BDDFF]/20 flex items-center justify-center">
                        <Users size={20} className="text-[#9BDDFF]" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{getAthleteDisplayName(member)}</p>
                        <p className="text-sm text-gray-400">
                          {member.athlete?.profile?.email || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-white/5 border border-white/10 text-gray-300 rounded capitalize">
                        {member.role}
                      </span>
                      <span className="text-sm text-gray-500 hidden sm:inline">
                        Joined {(() => {
                          const date = new Date(member.joined_at);
                          return date.toLocaleDateString();
                        })()}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Staff View */}
        {currentView === 'staff' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Staff & Coaches</h2>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
              >
                <Plus size={18} />
                Add Staff
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <Users className="mx-auto text-gray-500 mb-2" size={48} />
                <p className="text-gray-400">No staff assigned to this group yet</p>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
                >
                  Add First Staff Member
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
                {staff.map((staffMember) => (
                  <div key={staffMember.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Users size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {staffMember.staff?.first_name && staffMember.staff?.last_name
                            ? `${staffMember.staff.first_name} ${staffMember.staff.last_name}`
                            : staffMember.staff?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {staffMember.staff?.email || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded capitalize">
                        {staffMember.staff?.app_role || 'Coach'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-white/5 border border-white/10 text-gray-300 rounded capitalize">
                        {staffMember.role}
                      </span>
                      <button
                        onClick={() => handleRemoveStaff(staffMember.id)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showAddMemberModal && (
          <AddMemberModal
            groupId={groupId}
            existingMemberIds={members.map(m => m.athlete_id)}
            onClose={() => setShowAddMemberModal(false)}
            onAdded={() => {
              setShowAddMemberModal(false);
              fetchGroupDetails();
            }}
          />
        )}

        {showAddStaffModal && (
          <AddStaffModal
            groupId={groupId}
            existingStaffIds={staff.map(s => s.staff_id)}
            onClose={() => setShowAddStaffModal(false)}
            onAdded={() => {
              setShowAddStaffModal(false);
              fetchGroupDetails();
            }}
          />
        )}

        {/* Workout Assignment Modals */}
        {showAddWorkoutModal && selectedDate && (
          <AddWorkoutToGroupModal
            groupId={groupId}
            initialDate={selectedDate}
            onClose={() => {
              setShowAddWorkoutModal(false);
              setSelectedDate(null);
            }}
            onAdded={() => {
              setShowAddWorkoutModal(false);
              setSelectedDate(null);
              fetchGroupDetails();
            }}
          />
        )}

        {showAddRoutineModal && selectedDate && (
          <AddRoutineToGroupModal
            groupId={groupId}
            initialDate={selectedDate}
            onClose={() => {
              setShowAddRoutineModal(false);
              setSelectedDate(null);
            }}
            onAdded={() => {
              setShowAddRoutineModal(false);
              setSelectedDate(null);
              fetchGroupDetails();
            }}
          />
        )}

        {showAssignPlanModal && (
          <AssignPlanToGroupModal
            groupId={groupId}
            onClose={() => setShowAssignPlanModal(false)}
            onAdded={() => {
              setShowAssignPlanModal(false);
              fetchGroupDetails();
            }}
          />
        )}

        {/* Workout Builder Modal for Editing */}
        {editingWorkoutId && (
          <WorkoutBuilderModal
            workoutId={editingWorkoutId}
            planId={null}
            athleteId={null}
            groupId={groupId}
            onClose={() => setEditingWorkoutId(null)}
            onSaved={() => {
              setEditingWorkoutId(null);
              fetchGroupDetails();
            }}
          />
        )}

        {/* Create Workout - Use Workout Builder */}
        {showCreateWorkoutModal && selectedDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Create Workout</h3>
              <p className="text-gray-400 mb-4">
                To create a new workout, please use the Workout Builder from the Workouts library page,
                then add it to the group calendar using the "Workout" button.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateWorkoutModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => router.push('/dashboard/workouts')}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
                >
                  Go to Workouts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clone Workout Modal */}
        {showCloneModal && cloneSchedule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Clone Workout</h3>

              <div className="mb-4">
                <p className="text-gray-400 mb-2">
                  Cloning: <span className="text-white font-semibold">{cloneSchedule.workout?.name || 'Workout'}</span>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Original date: {new Date(cloneSchedule.scheduled_date).toLocaleDateString()}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={cloneDate}
                  onChange={(e) => setCloneDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCloneModal(false);
                    setCloneSchedule(null);
                    setCloneDate('');
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCloneWorkout}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg transition-colors font-medium"
                >
                  Clone Workout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Day Cell Component
function DroppableDay({
  date,
  groupColor,
  isToday = false,
  schedules = [],
  showDetails = true,
  onDeleteSchedule,
  onEditSchedule,
  onCloneSchedule,
  onClickDate
}: {
  date: Date | null;
  groupColor: string;
  isToday?: boolean;
  schedules?: GroupWorkoutSchedule[];
  showDetails?: boolean;
  onDeleteSchedule?: (id: string) => void;
  onEditSchedule?: (workoutId: string) => void;
  onCloneSchedule?: (scheduleId: string) => void;
  onClickDate?: (dateStr: string) => void;
}) {
  const dateStr = date?.toISOString().split('T')[0] || '';
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    disabled: !date
  });

  if (!date) {
    return <div className="min-h-[100px] md:min-h-[120px] border-r border-b border-white/10 bg-white/[0.02]" />;
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] md:min-h-[120px] border-r border-b border-white/10 p-1.5 md:p-2 cursor-pointer transition-colors ${
        isToday ? 'bg-[#9BDDFF]/10' : 'hover:bg-white/5'
      } ${isOver ? 'bg-[#9BDDFF]/20 ring-2 ring-[#9BDDFF]/50' : ''}`}
      onClick={() => onClickDate?.(dateStr)}
    >
      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#9BDDFF]' : 'text-gray-400'}`}>
        {date.getDate()}
      </div>
      <div className="space-y-0.5 overflow-y-auto">
        {schedules.map((schedule) => (
          <DraggableWorkout
            key={schedule.id}
            schedule={schedule}
            groupColor={groupColor}
            showDetails={showDetails}
            onDelete={onDeleteSchedule}
            onEdit={onEditSchedule}
            onClone={onCloneSchedule}
          />
        ))}
      </div>
    </div>
  );
}

// Draggable Workout Component
function DraggableWorkout({
  schedule,
  groupColor,
  showDetails = true,
  onDelete,
  onEdit,
  onClone
}: {
  schedule: GroupWorkoutSchedule;
  groupColor: string;
  showDetails?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (workoutId: string) => void;
  onClone?: (scheduleId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule.id,
  });

  const categoryClass = getCategoryColor(schedule.workout?.category || null);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`text-xs px-1.5 py-0.5 rounded border group relative ${categoryClass} ${
        isDragging ? 'opacity-50' : 'cursor-move'
      } ${!showDetails ? 'truncate' : ''}`}
      title={schedule.workout?.name || 'Workout'}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Clone button - Top Left */}
        {onClone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClone(schedule.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-opacity flex-shrink-0"
            title="Clone workout"
          >
            <Copy size={12} />
          </button>
        )}

        <span className={`flex-1 ${!showDetails ? 'truncate' : ''}`}>
          {schedule.scheduled_time} {schedule.workout?.name || 'Workout'}
        </span>

        {/* Edit and Delete buttons - Top Right */}
        <div className="flex items-center gap-0.5">
          {onEdit && schedule.workout?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(schedule.workout!.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-opacity flex-shrink-0"
              title="Edit workout"
            >
              <Edit size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(schedule.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-opacity flex-shrink-0"
              title="Delete workout"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Duration (always shown) */}
      {schedule.workout?.estimated_duration_minutes && (
        <div className="text-[10px] opacity-75 mt-0.5">
          {schedule.workout.estimated_duration_minutes}min
        </div>
      )}

      {/* Detailed View - Routines and Exercises (EXACT COPY FROM ATHLETE CALENDAR) */}
      {showDetails && schedule.workout?.routines && schedule.workout.routines.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
          {schedule.workout.routines
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((routine: any, routineIndex: number) => (
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
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((routineExercise: any, exerciseIndex: number) => {
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
                              <div className="flex items-center gap-1 flex-wrap">
                                {/* Sets */}
                                {routineExercise.sets && (
                                  <span className="text-[9px]">{routineExercise.sets} Sets</span>
                                )}

                                {/* Show metrics from set_configurations or metric_targets */}
                                {(() => {
                                  // Check if we have per-set configuration
                                  const hasSetConfigurations = routineExercise.set_configurations &&
                                                              Array.isArray(routineExercise.set_configurations) &&
                                                              routineExercise.set_configurations.length > 0;

                                  const hasMetricTargets = routineExercise.metric_targets &&
                                                          Object.keys(routineExercise.metric_targets).length > 0;

                                  if (!hasSetConfigurations && !hasMetricTargets) {
                                    return null;
                                  }

                                  // Get all unique metric keys from all sets or metric_targets
                                  const allMetricKeys = new Set<string>();
                                  if (hasSetConfigurations) {
                                    routineExercise.set_configurations.forEach((setConfig: any) => {
                                      if (setConfig.metric_values) {
                                        Object.keys(setConfig.metric_values).forEach(key => allMetricKeys.add(key));
                                      }
                                    });
                                  } else if (hasMetricTargets) {
                                    Object.keys(routineExercise.metric_targets).forEach(key => allMetricKeys.add(key));
                                  }

                                  // Format metric name helper
                                  const formatMetricName = (metricKey: string): string => {
                                    if (metricKey.includes('_')) {
                                      const parts = metricKey.split('_');
                                      const lastPart = parts[parts.length - 1];
                                      if (['reps', 'velo', 'mph', 'weight', 'time', 'distance'].includes(lastPart.toLowerCase())) {
                                        const baseName = parts.slice(0, -1).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        const metricType = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
                                        return `${baseName} ${metricType}`;
                                      }
                                    }
                                    return metricKey.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                  };

                                  // Check if metric is primary (reps-based)
                                  const isPrimaryMetric = (key: string) => key === 'reps' || key.toLowerCase().endsWith('_reps');

                                  return Array.from(allMetricKeys).map((key: string) => {
                                    if (!key) return null;

                                    // Skip secondary metrics with 0/null values in metric_targets
                                    if (!hasSetConfigurations && !isPrimaryMetric(key)) {
                                      const value = routineExercise.metric_targets[key];
                                      if (!value || value === 0) return null;
                                    }

                                    const formattedKey = formatMetricName(key);

                                    // Check for per-set values for THIS metric
                                    if (hasSetConfigurations) {
                                      const hasPerSetValues = routineExercise.set_configurations.some((s: any) =>
                                        s.metric_values?.[key] !== undefined && s.metric_values?.[key] !== null
                                      );

                                      if (hasPerSetValues) {
                                        const valuesArray = routineExercise.set_configurations.map((s: any) => {
                                          const val = s.metric_values?.[key];
                                          return (val === null || val === undefined) ? 0 : val;
                                        });
                                        return <span key={key} className="text-[9px]">{formattedKey}: {valuesArray.join(', ')}</span>;
                                      }
                                    }

                                    // Fallback to metric_targets or show AMRAP
                                    if (key === 'reps' && routineExercise.is_amrap) {
                                      return <span key={key} className="text-[9px] text-purple-300">AMRAP</span>;
                                    }

                                    const value = routineExercise.metric_targets?.[key];
                                    const displayValue = (value === null || value === undefined) ? 0 : value;
                                    return <span key={key} className="text-[9px]">{formattedKey}: {displayValue}</span>;
                                  });
                                })()}

                                {/* Intensity */}
                                {routineExercise.intensity_targets && routineExercise.intensity_targets.length > 0 && (
                                  <span className="text-[9px] text-blue-300">@{routineExercise.intensity_targets[0].percent}%</span>
                                )}

                                {/* Not configured badge */}
                                {(() => {
                                  const hasSetConfigs = routineExercise.set_configurations && routineExercise.set_configurations.length > 0;
                                  const hasMetricTargets = routineExercise.metric_targets && Object.keys(routineExercise.metric_targets).length > 0;
                                  if (!hasSetConfigs && !hasMetricTargets) {
                                    return <span className="text-[9px] text-yellow-300">Not configured</span>;
                                  }
                                  return null;
                                })()}
                              </div>

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

      {/* Sync Status */}
      {showDetails && schedule.synced_count! > 0 && (
        <div className="text-[9px] opacity-60 mt-1 pt-1 border-t border-white/10">
          {schedule.synced_count} synced{schedule.detached_count! > 0 ? `, ${schedule.detached_count} detached` : ''}
        </div>
      )}
    </div>
  );
}

// Add Member Modal with Search
function AddMemberModal({
  groupId,
  existingMemberIds,
  onClose,
  onAdded
}: {
  groupId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAvailableAthletes();
  }, []);

  useEffect(() => {
    filterAthletes();
  }, [searchQuery, athletes]);

  async function fetchAvailableAthletes() {
    const { data: athletesData } = await supabase
      .from('athletes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false});

    if (!athletesData) {
      setLoading(false);
      return;
    }

    // Fetch profiles for these athletes
    const userIds = athletesData.map(a => a.user_id).filter(Boolean);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    // Map profiles to athletes
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const enrichedAthletes = athletesData.map(athlete => ({
      ...athlete,
      profile: athlete.user_id ? profilesMap.get(athlete.user_id) : null
    }));

    // Filter out existing members
    const available = enrichedAthletes.filter(a => !existingMemberIds.includes(a.id));

    setAthletes(available);
    setFilteredAthletes(available);
    setLoading(false);
  }

  function filterAthletes() {
    let filtered = [...athletes];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(athlete => {
        const name = getAthleteDisplayName(athlete).toLowerCase();
        const email = athlete.profile?.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      });
    }

    setFilteredAthletes(filtered);
  }

  async function handleAddSelected() {
    if (selectedAthletes.size === 0) {
      alert('Please select at least one athlete');
      return;
    }

    setSaving(true);

    const inserts = Array.from(selectedAthletes).map(athlete_id => ({
      group_id: groupId,
      athlete_id,
      role: 'member'
    }));

    console.log('Attempting to insert group members:', inserts);

    const { data, error } = await supabase
      .from('group_members')
      .insert(inserts)
      .select();

    if (error) {
      console.error('Error adding members:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      alert(`Failed to add members: ${error.message || 'Unknown error'}`);
      setSaving(false);
      return;
    }

    console.log('Successfully added members:', data);
    onAdded();
  }

  function toggleAthleteSelection(athleteId: string) {
    const newSelected = new Set(selectedAthletes);
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId);
    } else {
      newSelected.add(athleteId);
    }
    setSelectedAthletes(newSelected);
  }

  function getAthleteDisplayName(athlete: any): string {
    if (athlete.profile) {
      const { first_name, last_name } = athlete.profile;
      if (first_name && last_name) return `${first_name} ${last_name}`;
      if (first_name) return first_name;
      if (last_name) return last_name;
    }
    return athlete.profile?.email || 'Unknown';
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Add Athletes to Group</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading athletes...</div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search athletes by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              />
            </div>

            {/* Athletes List */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-[200px] max-h-[400px]">
              {filteredAthletes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {athletes.length === 0 ? 'No available athletes to add' : 'No athletes match your search'}
                </div>
              ) : (
                filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    onClick={() => toggleAthleteSelection(athlete.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAthletes.has(athlete.id)
                        ? 'bg-[#9BDDFF]/20 border-[#9BDDFF]/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white">{getAthleteDisplayName(athlete)}</p>
                        <p className="text-sm text-gray-400">{athlete.profile?.email || ''}</p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedAthletes.has(athlete.id)
                          ? 'bg-[#9BDDFF] border-[#9BDDFF]'
                          : 'border-gray-600'
                      }`}>
                        {selectedAthletes.has(athlete.id) && (
                          <Check size={14} className="text-black" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={saving || selectedAthletes.size === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Adding...' : `Add Selected (${selectedAthletes.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Add Staff Modal
function AddStaffModal({
  groupId,
  existingStaffIds,
  onClose,
  onAdded
}: {
  groupId: string;
  existingStaffIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [staff, setStaff] = useState<any[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<'owner' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAvailableStaff();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [searchQuery, staff]);

  async function fetchAvailableStaff() {
    const { data: staffData } = await supabase
      .from('profiles')
      .select('*')
      .in('app_role', ['coach', 'admin', 'super_admin'])
      .order('first_name', { ascending: true });

    if (!staffData) {
      setLoading(false);
      return;
    }

    const available = staffData.filter(s => !existingStaffIds.includes(s.id));
    setStaff(available);
    setFilteredStaff(available);
    setLoading(false);
  }

  function filterStaff() {
    let filtered = [...staff];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(person => {
        const name = getStaffDisplayName(person).toLowerCase();
        const email = person.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      });
    }
    setFilteredStaff(filtered);
  }

  async function handleAddSelected() {
    if (selectedStaff.size === 0) {
      alert('Please select at least one staff member');
      return;
    }

    setSaving(true);
    const inserts = Array.from(selectedStaff).map(staff_id => ({
      group_id: groupId,
      staff_id,
      role
    }));

    const { error } = await supabase.from('staff_groups').insert(inserts);

    if (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff members');
      setSaving(false);
      return;
    }

    onAdded();
  }

  function toggleStaffSelection(staffId: string) {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaff(newSelected);
  }

  function getStaffDisplayName(person: any): string {
    if (person.first_name && person.last_name) return `${person.first_name} ${person.last_name}`;
    if (person.first_name) return person.first_name;
    if (person.last_name) return person.last_name;
    return person.email || 'Unknown';
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Add Staff to Group</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading staff...</div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Search staff by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent" />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Group Role</label>
                <div className="flex gap-3">
                  <button onClick={() => setRole('member')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${role === 'member' ? 'bg-[#9BDDFF] text-black' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>Member</button>
                  <button onClick={() => setRole('owner')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${role === 'owner' ? 'bg-[#9BDDFF] text-black' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>Owner</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Owners can manage group settings and members</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-[200px] max-h-[400px]">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-gray-400">{staff.length === 0 ? 'No available staff to add' : 'No staff match your search'}</div>
              ) : (
                filteredStaff.map((person) => (
                  <div key={person.id} onClick={() => toggleStaffSelection(person.id)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStaff.has(person.id) ? 'bg-[#9BDDFF]/20 border-[#9BDDFF]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white">{getStaffDisplayName(person)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm text-gray-400">{person.email || ''}</p>
                          <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded text-xs capitalize">{person.app_role}</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedStaff.has(person.id) ? 'bg-[#9BDDFF] border-[#9BDDFF]' : 'border-gray-600'}`}>
                        {selectedStaff.has(person.id) && (<Check size={14} className="text-black" />)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors">Cancel</button>
              <button onClick={handleAddSelected} disabled={saving || selectedStaff.size === 0} className="flex-1 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black rounded-lg disabled:opacity-50 transition-colors font-medium">{saving ? 'Adding...' : `Add Selected (${selectedStaff.size})`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
