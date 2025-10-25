'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Calendar as CalendarIcon, Plus, Users, Settings, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
  description: string | null;
}

interface GroupWorkoutSchedule {
  id: string;
  workout_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string | null;
  auto_assign: boolean;
  workout?: Workout;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [schedules, setSchedules] = useState<GroupWorkoutSchedule[]>([]);
  const [currentView, setCurrentView] = useState<'calendar' | 'members'>('calendar');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showScheduleWorkoutModal, setShowScheduleWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && groupId) {
      fetchGroupDetails();
    }
  }, [mounted, groupId]);

  async function fetchGroupDetails() {
    const supabase = createClient();
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

    // Fetch workout schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('group_workout_schedules')
      .select(`
        *,
        workout:workouts(id, name, description)
      `)
      .eq('group_id', groupId)
      .order('scheduled_date', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
    } else {
      setSchedules(schedulesData || []);
    }

    setLoading(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remove this member from the group?')) return;

    const supabase = createClient();
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

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Delete this scheduled workout?')) return;

    const supabase = createClient();
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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
          <Link href="/dashboard/groups" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/groups"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Groups
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: group.color + '20' }}
            >
              <Users size={32} style={{ color: group.color }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{members.length} members</p>
            </div>
          </div>
          <Link
            href={`/dashboard/groups/${groupId}/settings`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Settings size={24} />
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setCurrentView('calendar')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'calendar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
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
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Members ({members.length})
          </div>
        </button>
      </div>

      {/* Calendar View */}
      {currentView === 'calendar' && (
        <div>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{formatDate(currentMonth)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={previousMonth}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next
              </button>
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setShowScheduleWorkoutModal(true);
                }}
                className="ml-4 flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Schedule Workout
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {getDaysInMonth(currentMonth).map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-24 border-r border-b border-gray-200 bg-gray-50" />;
                }

                const daySchedules = getSchedulesForDate(day);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`h-24 border-r border-b border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${
                      today ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(day.toISOString().split('T')[0]);
                      setShowScheduleWorkoutModal(true);
                    }}
                  >
                    <div className={`text-sm font-medium mb-1 ${today ? 'text-blue-600' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-16">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate"
                          style={{ backgroundColor: group.color + '30', color: group.color }}
                          title={schedule.workout?.name || 'Workout'}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Could open a detail modal here
                          }}
                        >
                          {schedule.scheduled_time} {schedule.workout?.name || 'Workout'}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Workouts List */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Workouts</h3>
            {schedules.filter(s => new Date(s.scheduled_date) >= new Date()).length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
                No upcoming workouts scheduled
              </div>
            ) : (
              <div className="space-y-2">
                {schedules
                  .filter(s => new Date(s.scheduled_date) >= new Date())
                  .slice(0, 5)
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: group.color + '20' }}
                        >
                          <CalendarIcon size={20} style={{ color: group.color }} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{schedule.workout?.name || 'Workout'}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(schedule.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {schedule.scheduled_time && ` at ${schedule.scheduled_time}`}
                          </p>
                          {schedule.notes && (
                            <p className="text-sm text-gray-500 mt-1">{schedule.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            schedule.auto_assign
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {schedule.auto_assign ? 'Auto-assign' : 'Manual'}
                        </span>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members View */}
      {currentView === 'members' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Group Members</h2>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Users className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-gray-600">No members in this group yet</p>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Member
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y">
              {members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAthleteDisplayName(member)}</p>
                      <p className="text-sm text-gray-500">
                        {member.athlete?.profile?.email || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">
                      {member.role}
                    </span>
                    <span className="text-sm text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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

      {/* Add Member Modal */}
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

      {/* Schedule Workout Modal */}
      {showScheduleWorkoutModal && (
        <ScheduleWorkoutModal
          groupId={groupId}
          initialDate={selectedDate}
          onClose={() => {
            setShowScheduleWorkoutModal(false);
            setSelectedDate(null);
          }}
          onScheduled={() => {
            setShowScheduleWorkoutModal(false);
            setSelectedDate(null);
            fetchGroupDetails();
          }}
        />
      )}
    </div>
  );
}

// Add Member Modal
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
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailableAthletes();
  }, []);

  async function fetchAvailableAthletes() {
    const supabase = createClient();

    const { data: athletesData } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(id, first_name, last_name, email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Filter out existing members
    const available = (athletesData || []).filter(a => !existingMemberIds.includes(a.id));
    setAthletes(available);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selectedAthleteId) {
      alert('Please select an athlete');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        athlete_id: selectedAthleteId,
        role
      });

    if (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
      setSaving(false);
      return;
    }

    onAdded();
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
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Member to Group</h2>

        {loading ? (
          <div className="text-center py-8">Loading athletes...</div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No available athletes to add
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Athlete *
              </label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an athlete...</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {getAthleteDisplayName(athlete)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="member">Member</option>
                <option value="leader">Leader</option>
                <option value="captain">Captain</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !selectedAthleteId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Schedule Workout Modal
function ScheduleWorkoutModal({
  groupId,
  initialDate,
  onClose,
  onScheduled
}: {
  groupId: string;
  initialDate: string | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function fetchWorkouts() {
    const supabase = createClient();

    const { data: workoutsData } = await supabase
      .from('workouts')
      .select('id, name, description')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    setWorkouts(workoutsData || []);
    setLoading(false);
  }

  async function handleSchedule() {
    if (!selectedWorkoutId || !scheduledDate) {
      alert('Please select a workout and date');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('group_workout_schedules')
      .insert({
        group_id: groupId,
        workout_id: selectedWorkoutId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        notes: notes || null,
        auto_assign: autoAssign,
        created_by: user?.id
      });

    if (error) {
      console.error('Error scheduling workout:', error);
      alert('Failed to schedule workout');
      setSaving(false);
      return;
    }

    onScheduled();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Group Workout</h2>

        {loading ? (
          <div className="text-center py-8">Loading workouts...</div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No workouts available. Create a workout first.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Workout *
              </label>
              <select
                value={selectedWorkoutId}
                onChange={(e) => setSelectedWorkoutId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a workout...</option>
                {workouts.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time (optional)
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Any special instructions..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-assign"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="auto-assign" className="text-sm text-gray-700">
                Automatically assign to all group members
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={saving || !selectedWorkoutId || !scheduledDate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Scheduling...' : 'Schedule Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
