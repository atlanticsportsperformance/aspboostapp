'use client';

/**
 * Default Athlete Dashboard View
 *
 * This is the default view shown when an athlete has no specific view_type_id assigned.
 * It provides a general-purpose dashboard with force plate testing and workout tracking.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface DefaultAthleteViewProps {
  athleteId: string;
  fullName: string;
}

export default function DefaultAthleteView({ athleteId, fullName }: DefaultAthleteViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    recentTests: 0,
    upcomingWorkouts: 0,
    completedWorkouts: 0
  });

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardStats();
  }, [athleteId]);

  async function fetchDashboardStats() {
    try {
      // Fetch various stats for the dashboard
      // TODO: Implement actual stat queries

      setStats({
        totalTests: 0,
        recentTests: 0,
        upcomingWorkouts: 0,
        completedWorkouts: 0
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Welcome, {fullName}
          </h1>
          <p className="text-gray-400">Your training dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalTests}</p>
                <p className="text-sm text-gray-400">Total Tests</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.recentTests}</p>
                <p className="text-sm text-gray-400">Recent Tests</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.upcomingWorkouts}</p>
                <p className="text-sm text-gray-400">Upcoming Workouts</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.completedWorkouts}</p>
                <p className="text-sm text-gray-400">Completed Workouts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/athlete-dashboard/tests/cmj"
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-6 transition-all hover:scale-105"
          >
            <h3 className="text-lg font-semibold text-white mb-2">View Tests</h3>
            <p className="text-sm text-gray-400">Check your force plate test results and progress</p>
          </Link>

          <Link
            href="/athlete-dashboard/force-profile"
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-6 transition-all hover:scale-105"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Force Profile</h3>
            <p className="text-sm text-gray-400">View your strength and power profile</p>
          </Link>

          <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-xl p-6 opacity-50 cursor-not-allowed">
            <h3 className="text-lg font-semibold text-white mb-2">Workouts</h3>
            <p className="text-sm text-gray-400">Coming soon</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">About Your Dashboard</h3>
          <p className="text-gray-400 text-sm mb-3">
            This is the default athlete view. If your coach assigns you a specific training focus,
            you'll see a customized dashboard tailored to your needs.
          </p>
          <p className="text-gray-400 text-sm">
            Current features include force plate testing, performance tracking, and workout management.
          </p>
        </div>
      </div>
    </div>
  );
}
