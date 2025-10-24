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

  useEffect(() => {
    fetchOverviewData();
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

      // Get workout instances to find workouts with scheduled dates
      const today2 = new Date().toISOString().split('T')[0];

      const { data: workoutInstances } = await supabase
        .from('workout_instances')
        .select('workout_id, scheduled_date')
        .eq('athlete_id', athlete.id)
        .gte('scheduled_date', today2);

      const futureWorkoutIds = new Set((workoutInstances || []).map(wi => wi.workout_id));

      // Get all workouts for this athlete with category for color coding
      // Only show workouts that have future scheduled dates
      const { data: taggedWorkouts } = await supabase
        .from('workouts')
        .select('id, name, category, estimated_duration_minutes, created_at')
        .eq('athlete_id', athlete.id)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      // Filter to only show workouts with future dates
      const futureWorkouts = (taggedWorkouts || []).filter(workout =>
        futureWorkoutIds.has(workout.id)
      );

      console.log('Future athlete workouts:', futureWorkouts);

      setTaggedItems({
        plans: [],
        workouts: futureWorkouts,
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
    <div className="space-y-6">
      {/* Top Row - Stats and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Workouts */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-2">Total Workouts</p>
          <p className="text-3xl font-bold text-white">{stats.totalWorkouts}</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-2">Completion Rate</p>
          <p className="text-3xl font-bold text-white">{stats.completionRate}%</p>
        </div>

        {/* Personal Records Button */}
        <Link
          href={`/dashboard/athletes/${athlete.id}/records`}
          className="bg-gradient-to-br from-[#C9A857]/10 to-transparent border border-[#C9A857]/20 rounded-xl p-5 hover:border-[#C9A857]/40 transition-all group flex items-center justify-between"
        >
          <div>
            <p className="text-gray-400 text-sm mb-1">View</p>
            <p className="text-white font-bold group-hover:text-[#C9A857] transition-colors">Personal Records</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#C9A857]/10 flex items-center justify-center">
            <span className="text-xl">🏆</span>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-[#C9A857] to-[#A08845] flex items-center justify-center text-black font-bold text-3xl mb-4">
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
        </div>

        {/* Contact Information */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Contact Information</h3>
            <button
              onClick={() => alert('Edit contact - Coming soon')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {profile?.email && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <a href={`mailto:${profile.email}`} className="text-white hover:text-[#C9A857] transition-colors">
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
                  <a href={`tel:${profile.phone}`} className="text-white hover:text-[#C9A857] transition-colors">
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
                      <a href={`mailto:${contact.email}`} className="text-sm text-gray-400 hover:text-[#C9A857] block">
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-sm text-gray-400 hover:text-[#C9A857] block">
                        {contact.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Physical Stats */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Physical Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Height</p>
              <p className="text-xl font-bold text-white">
                {formatHeight(athlete.height_inches) || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Weight</p>
              <p className="text-xl font-bold text-white">
                {athlete.weight_lbs ? `${athlete.weight_lbs} lbs` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Dominant Hand</p>
              <p className="text-white capitalize">
                {athlete.dominant_hand || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Secondary Pos.</p>
              <p className="text-white">
                {athlete.secondary_position || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Group Assignments */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Group Assignments</h3>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{team.name}</p>
                    <p className="text-sm text-gray-400 capitalize">{team.level.replace('_', ' ')}</p>
                  </div>
                  {team.jersey_number && (
                    <span className="px-3 py-1 bg-[#C9A857]/10 text-[#C9A857] rounded-md font-bold">
                      #{team.jersey_number}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No group assignments</p>
          )}
        </div>

        {/* Workouts - Color Coded by Category */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Workouts</h3>
              <p className="text-xs text-gray-400 mt-1">{taggedItems.workouts.length} custom workouts</p>
            </div>
            <button
              onClick={handleDeleteAllContent}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20"
            >
              Delete All
            </button>
          </div>

          {taggedItems.workouts.length > 0 ? (
            <div className="space-y-2">
              {taggedItems.workouts.map((workout: any) => (
                <div
                  key={workout.id}
                  className={`p-3 rounded-lg border-l-4 ${getCategoryColor(workout.category)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm">{workout.name}</p>
                        {workout.category && (
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300 capitalize">
                            {workout.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {workout.estimated_duration_minutes && (
                          <span>{workout.estimated_duration_minutes} min</span>
                        )}
                        <span>•</span>
                        <span>
                          Created {new Date(workout.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No custom workouts yet</p>
              <p className="text-gray-500 text-xs mt-1">Create workouts in the Calendar tab</p>
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'workout_completed' ? 'bg-emerald-500/10' :
                    activity.type === 'plan_assigned' ? 'bg-blue-500/10' :
                    'bg-gray-500/10'
                  }`}>
                    <svg className={`h-5 w-5 ${
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
                  <div className="flex-1">
                    <p className="text-white">{activity.description}</p>
                    <p className="text-sm text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
