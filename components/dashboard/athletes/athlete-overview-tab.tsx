'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface OverviewTabProps {
  athleteData: any;
}

export default function OverviewTab({ athleteData }: OverviewTabProps) {
  const { athlete, profile, teams, currentPlan, planAssignment } = athleteData;

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    completionRate: 0,
    currentStreak: 0,
    lastActivity: null as string | null
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [taggedItems, setTaggedItems] = useState({
    plans: [] as any[],
    workouts: [] as any[],
    routines: [] as any[]
  });
  const [athleteTags, setAthleteTags] = useState<any[]>([]);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [groupMemberships, setGroupMemberships] = useState<any[]>([]);

  useEffect(() => {
    fetchOverviewData();
    fetchGroupMemberships();
  }, [athlete.id]);

  async function handleDeleteAllContent() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL workouts, routines, workout instances, and plan assignments for this athlete. This cannot be undone.\n\nAre you absolutely sure?')) {
      return;
    }

    const supabase = createClient();

    try {
      console.log('Starting delete all content for athlete:', athlete.id);

      // 1. Get all workouts for this athlete
      const { data: athleteWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('athlete_id', athlete.id);

      if (athleteWorkouts && athleteWorkouts.length > 0) {
        const workoutIds = athleteWorkouts.map(w => w.id);

        // 2. Get all routines for these workouts
        const { data: routines } = await supabase
          .from('routines')
          .select('id')
          .in('workout_id', workoutIds);

        if (routines && routines.length > 0) {
          const routineIds = routines.map(r => r.id);

          // 3. Delete routine exercises
          await supabase
            .from('routine_exercises')
            .delete()
            .in('routine_id', routineIds);

          console.log('Deleted routine exercises');
        }

        // 4. Delete routines
        await supabase
          .from('routines')
          .delete()
          .in('workout_id', workoutIds);

        console.log('Deleted routines');

        // 5. Delete workouts
        await supabase
          .from('workouts')
          .delete()
          .eq('athlete_id', athlete.id);

        console.log('Deleted workouts');
      }

      // 6. Delete all workout instances for this athlete
      await supabase
        .from('workout_instances')
        .delete()
        .eq('athlete_id', athlete.id);

      console.log('Deleted workout instances');

      // 7. Delete all plan assignments for this athlete
      await supabase
        .from('plan_assignments')
        .delete()
        .eq('athlete_id', athlete.id);

      console.log('Deleted plan assignments');

      // 8. Refresh the data
      await fetchOverviewData();

      alert('✅ All content has been deleted successfully');
    } catch (error) {
      console.error('Error deleting all content:', error);
      alert('Failed to delete all content. Check console for details.');
    }
  }

  async function fetchOverviewData() {
    const supabase = createClient();

      console.log('=== OVERVIEW TAB LOADING ===');

      // Get all workout instances for stats
      const { data: allWorkouts } = await supabase
        .from('workout_instances')
        .select('*')
        .eq('athlete_id', athlete.id)
        .order('scheduled_date', { ascending: false });

      console.log('All workouts:', allWorkouts);

      // Get last 30 days for completion rate
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const recentWorkouts = (allWorkouts || []).filter(
        (w: any) => w.scheduled_date >= thirtyDaysAgoStr
      );

      const completed = recentWorkouts.filter((w: any) => w.status === 'completed').length;
      const total = recentWorkouts.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate current streak
      const completedDates = (allWorkouts || [])
        .filter((w: any) => w.status === 'completed' && w.completed_at)
        .map((w: any) => w.completed_at.split('T')[0])
        .sort()
        .reverse();

      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date();

      for (let i = 0; i < completedDates.length; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (completedDates.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Last activity
      const lastCompleted = (allWorkouts || [])
        .filter((w: any) => w.completed_at)
        .sort((a: any, b: any) => b.completed_at.localeCompare(a.completed_at))[0];

      setStats({
        totalWorkouts: allWorkouts?.length || 0,
        completionRate: rate,
        currentStreak: streak,
        lastActivity: lastCompleted?.completed_at || null
      });

      // Get upcoming workouts for the next 7 days
      const today2 = new Date();
      const nextWeek = new Date(today2);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const todayStr = today2.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const { data: upcomingInstances } = await supabase
        .from('workout_instances')
        .select('id, workout_id, scheduled_date, status, workouts(id, name, category, estimated_duration_minutes)')
        .eq('athlete_id', athlete.id)
        .gte('scheduled_date', todayStr)
        .lte('scheduled_date', nextWeekStr)
        .order('scheduled_date', { ascending: true });

      console.log('Upcoming workouts (next 7 days):', upcomingInstances);

      setTaggedItems({
        plans: [],
        workouts: upcomingInstances || [],
        routines: []
      });

      // Get contacts (parent contacts)
      if (profile?.id) {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('*')
          .eq('athlete_id', athlete.id);

        console.log('Contacts:', contactsData);
        setContacts(contactsData || []);
      }

      // Build recent activity feed
      const activityFeed: any[] = [];

      // Add completed workouts
      const recentCompleted = (allWorkouts || [])
        .filter((w: any) => w.status === 'completed' && w.completed_at)
        .slice(0, 5);

      recentCompleted.forEach((w: any) => {
        activityFeed.push({
          type: 'workout_completed',
          timestamp: w.completed_at,
          description: 'Completed a workout'
        });
      });

      // Add plan assignment
      if (planAssignment) {
        activityFeed.push({
          type: 'plan_assigned',
          timestamp: planAssignment.assigned_at,
          description: `Assigned to ${currentPlan.name}`
        });
      }

      // Sort by timestamp
      activityFeed.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setRecentActivity(activityFeed.slice(0, 10));

      // Fetch athlete tags
      const { data: tagsData } = await supabase
        .from('athlete_tags')
        .select('tag_name, tag_type')
        .eq('athlete_id', athlete.id);

      console.log('Athlete tags:', tagsData);
      setAthleteTags(tagsData || []);
  }

  async function fetchGroupMemberships() {
    const supabase = createClient();

    const { data: memberships, error } = await supabase
      .from('group_members')
      .select(`
        *,
        groups(id, name, color, description)
      `)
      .eq('athlete_id', athlete.id);

    if (error) {
      console.error('Error fetching group memberships:', error);
    } else {
      setGroupMemberships(memberships || []);
    }
  }

  async function handleRemoveFromGroup(membershipId: string) {
    if (!confirm('Remove this athlete from the group? Their group workouts will be detached.')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', membershipId);

    if (error) {
      console.error('Error removing from group:', error);
      alert('Failed to remove from group');
      return;
    }

    // Refresh memberships
    fetchGroupMemberships();
  }

  const formatAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (inches: number | null) => {
    if (!inches) return null;
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-emerald-500/10 text-emerald-400',
      in_progress: 'bg-blue-500/10 text-blue-400',
      not_started: 'bg-gray-500/10 text-gray-400',
      skipped: 'bg-red-500/10 text-red-400'
    };
    return styles[status as keyof typeof styles] || styles.not_started;
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-500/20 border-gray-500/50';
    if (category === 'hitting') return 'bg-red-500/20 border-red-500/50';
    if (category === 'throwing') return 'bg-blue-500/20 border-blue-500/50';
    if (category === 'fielding') return 'bg-green-500/20 border-green-500/50';
    if (category === 'strength') return 'bg-purple-500/20 border-purple-500/50';
    if (category === 'conditioning') return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-gray-500/20 border-gray-500/50';
  };

  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : `Athlete #${athlete.id.slice(0, 8)}`;

  const age = formatAge(athlete.date_of_birth);

  return (
    <div className="space-y-4">
      {/* Stats Row - Compact for Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Workouts */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
          <p className="text-gray-400 text-xs lg:text-sm mb-1">Total Workouts</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{stats.totalWorkouts}</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
          <p className="text-gray-400 text-xs lg:text-sm mb-1">Completion Rate</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{stats.completionRate}%</p>
        </div>

        {/* Current Streak */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
          <p className="text-gray-400 text-xs lg:text-sm mb-1">Current Streak</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{stats.currentStreak} days</p>
        </div>

        {/* Personal Records Button */}
        <Link
          href={`/dashboard/athletes/${athlete.id}/records`}
          className="bg-gradient-to-br from-[#9BDDFF]/10 to-transparent border border-[#9BDDFF]/20 rounded-xl p-3 lg:p-4 hover:border-[#9BDDFF]/40 transition-all group flex flex-col items-center justify-center"
        >
          <span className="text-lg mb-1">🏆</span>
          <p className="text-white text-xs lg:text-sm font-semibold group-hover:text-[#9BDDFF] transition-colors text-center">Records</p>
        </Link>
      </div>

      {/* Upcoming Workouts - Priority Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Upcoming Workouts</h3>
          <p className="text-xs text-gray-400 mt-1">{taggedItems.workouts.length} scheduled this week</p>
        </div>

        {taggedItems.workouts.length > 0 ? (
          <div className="space-y-2 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-2">
            {taggedItems.workouts.map((instance: any) => (
              <div
                key={instance.id}
                className={`p-3 rounded-lg border-l-4 ${getCategoryColor(instance.workouts?.category)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm truncate">{instance.workouts?.name || 'Unnamed Workout'}</p>
                      {instance.workouts?.category && (
                        <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300 capitalize flex-shrink-0">
                          {instance.workouts.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>
                        {new Date(instance.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {instance.workouts?.estimated_duration_minutes && (
                        <>
                          <span>•</span>
                          <span>{instance.workouts.estimated_duration_minutes} min</span>
                        </>
                      )}
                      <span>•</span>
                      <span className={`${getStatusBadge(instance.status)} px-2 py-0.5 rounded`}>
                        {instance.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No upcoming workouts</p>
            <p className="text-gray-500 text-xs mt-1">Schedule workouts in the Calendar tab</p>
          </div>
        )}
      </div>

      {/* Main Content - Stack on Mobile, Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Profile Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Profile</h2>
            <button
              onClick={() => alert('Edit profile - Coming soon')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center text-black font-bold text-3xl mb-4">
              {profile?.first_name?.[0] || 'A'}
              {profile?.last_name?.[0] || ''}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{fullName}</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {athlete.primary_position && (
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-md text-sm font-medium">
                  {athlete.primary_position}
                </span>
              )}
              {age && (
                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-md text-sm font-medium">
                  {age} years old
                </span>
              )}
              {athlete.grad_year && (
                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-md text-sm font-medium">
                  Class of {athlete.grad_year}
                </span>
              )}
            </div>
          </div>

          {athlete.bio && (
            <p className="text-gray-400 text-sm mb-4 pb-4 border-b border-white/10">
              {athlete.bio}
            </p>
          )}

          {/* Tags Section */}
          {athleteTags.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-semibold text-[#9BDDFF] mb-3">ATHLETE TAGS</h4>
              <div className="space-y-3">
                {/* Plan Tags */}
                {athleteTags.filter(t => t.tag_type === 'plan').length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Plans</p>
                    <div className="flex flex-wrap gap-1.5">
                      {athleteTags
                        .filter(t => t.tag_type === 'plan')
                        .map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Workout Tags */}
                {athleteTags.filter(t => t.tag_type === 'workout').length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Workouts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {athleteTags
                        .filter(t => t.tag_type === 'workout')
                        .map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Exercise Tags */}
                {athleteTags.filter(t => t.tag_type === 'exercise').length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Exercises</p>
                    <div className="flex flex-wrap gap-1.5">
                      {athleteTags
                        .filter(t => t.tag_type === 'exercise')
                        .map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30"
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact & Details */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Contact & Details</h3>
            <button
              onClick={() => alert('Edit contact - Coming soon')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Contact Information */}
            <div className="space-y-3">
              {profile?.email && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <a href={`mailto:${profile.email}`} className="text-white hover:text-[#9BDDFF] transition-colors">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}

              {profile?.phone && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Phone</p>
                    <a href={`tel:${profile.phone}`} className="text-white hover:text-[#9BDDFF] transition-colors">
                      {profile.phone}
                    </a>
                  </div>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-3">Parent/Guardian Contacts</p>
                  {contacts.map((contact) => (
                    <div key={contact.id} className="mb-3 last:mb-0">
                      <p className="text-white font-medium">{contact.first_name} {contact.last_name}</p>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-sm text-gray-400 hover:text-[#9BDDFF] block">
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-sm text-gray-400 hover:text-[#9BDDFF] block">
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Physical Stats */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-3">Physical Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Height</p>
                  <p className="text-white font-semibold">
                    {formatHeight(athlete.height_inches) || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Weight</p>
                  <p className="text-white font-semibold">
                    {athlete.weight_lbs ? `${athlete.weight_lbs} lbs` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Dominant Hand</p>
                  <p className="text-white font-semibold capitalize">
                    {athlete.dominant_hand || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Secondary Pos.</p>
                  <p className="text-white font-semibold">
                    {athlete.secondary_position || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group Assignments */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base lg:text-lg font-bold text-white">Group Assignments</h3>
            <button
              onClick={() => setShowAddToGroupModal(true)}
              className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] transition-colors font-medium"
            >
              + Add
            </button>
          </div>
            {groupMemberships.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {groupMemberships.map((membership: any) => (
                  <div key={membership.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg gap-3 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{membership.groups?.name}</p>
                      <p className="text-xs lg:text-sm text-gray-400 capitalize truncate">{membership.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: membership.groups?.color || '#3b82f6' }}
                        title={`Group color: ${membership.groups?.color}`}
                      />
                      <button
                        onClick={() => handleRemoveFromGroup(membership.id)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs lg:text-sm">No group assignments</p>
            )}
          </div>

        {/* Recent Activity Feed */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
          <h3 className="text-base lg:text-lg font-bold text-white mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 lg:space-y-4 max-h-[300px] overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-2 lg:gap-3">
                  <div className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'workout_completed' ? 'bg-emerald-500/10' :
                    activity.type === 'plan_assigned' ? 'bg-blue-500/10' :
                    'bg-gray-500/10'
                  }`}>
                    <svg className={`h-4 w-4 lg:h-5 lg:w-5 ${
                      activity.type === 'workout_completed' ? 'text-emerald-400' :
                      activity.type === 'plan_assigned' ? 'text-blue-400' :
                      'text-gray-400'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {activity.type === 'workout_completed' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                      {activity.type === 'plan_assigned' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm lg:text-base truncate">{activity.description}</p>
                    <p className="text-xs lg:text-sm text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs lg:text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Add to Group Modal */}
      {showAddToGroupModal && (
        <AddAthleteToGroupModal
          athleteId={athlete.id}
          athleteName={fullName || 'Athlete'}
          existingGroupIds={groupMemberships.map(m => m.groups?.id).filter(Boolean)}
          onClose={() => setShowAddToGroupModal(false)}
          onAdded={() => {
            setShowAddToGroupModal(false);
            fetchGroupMemberships();
          }}
        />
      )}
    </div>
  );
}

// Add to Group Modal Component
function AddAthleteToGroupModal({
  athleteId,
  athleteName,
  existingGroupIds,
  onClose,
  onAdded
}: {
  athleteId: string;
  athleteName: string;
  existingGroupIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAvailableGroups();
  }, []);

  async function fetchAvailableGroups() {
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false});

    // Filter out groups athlete is already in
    const available = (groupsData || []).filter(g => !existingGroupIds.includes(g.id));
    setGroups(available);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selectedGroupId) {
      alert('Please select a group');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: selectedGroupId,
        athlete_id: athleteId,
        role
      });

    if (error) {
      console.error('Error adding to group:', error);
      alert('Failed to add to group');
      setSaving(false);
      return;
    }

    onAdded();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Add {athleteName} to Group</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No available groups to add to
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Group *
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
              >
                <option value="">Choose a group...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
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
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !selectedGroupId}
            className="flex-1 px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Adding...' : 'Add to Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
