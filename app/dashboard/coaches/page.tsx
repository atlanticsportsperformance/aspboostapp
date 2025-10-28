'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CoachesDashboardPage() {
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);

  // MOCK DATA - Beautiful placeholders for demo
  const mockAthletes = [
    {
      id: '1',
      name: 'Michael Chen',
      initials: 'MC',
      position: 'SS',
      gradYear: 2025,
      weeklyCompletion: 95,
      streak: 12,
      recentPR: { exercise: 'Squat', weight: 315, date: '2 days ago' },
      trend: 'up',
      nextTest: '2024-02-15',
      percentileChange: +8,
      image: null,
      tags: ['Elite Performer', 'Social Media Ready']
    },
    {
      id: '2',
      name: 'Jake Martinez',
      initials: 'JM',
      position: 'C',
      gradYear: 2026,
      weeklyCompletion: 88,
      streak: 7,
      recentPR: { exercise: 'Bench Press', weight: 225, date: '1 day ago' },
      trend: 'up',
      nextTest: '2024-02-18',
      percentileChange: +12,
      image: null,
      tags: ['Rising Star']
    },
    {
      id: '3',
      name: 'Sarah Johnson',
      initials: 'SJ',
      position: 'OF',
      gradYear: 2025,
      weeklyCompletion: 92,
      streak: 15,
      recentPR: { exercise: 'Deadlift', weight: 275, date: '3 days ago' },
      trend: 'up',
      nextTest: '2024-02-20',
      percentileChange: +15,
      image: null,
      tags: ['Streak Leader', 'Shoutout Ready']
    },
    {
      id: '4',
      name: 'Tyler Davis',
      initials: 'TD',
      position: '1B',
      gradYear: 2026,
      weeklyCompletion: 45,
      streak: 0,
      recentPR: null,
      trend: 'down',
      nextTest: '2024-02-12',
      percentileChange: -5,
      image: null,
      tags: ['Needs Check-In']
    },
    {
      id: '5',
      name: 'Emma Wilson',
      initials: 'EW',
      position: 'P',
      gradYear: 2025,
      weeklyCompletion: 78,
      streak: 4,
      recentPR: null,
      trend: 'stable',
      nextTest: '2024-02-25',
      percentileChange: +2,
      image: null,
      tags: []
    },
  ];

  const upcomingTests = [
    { date: '2024-02-12', athletes: ['Tyler Davis'], type: 'Force Plate' },
    { date: '2024-02-15', athletes: ['Michael Chen', 'Sarah Johnson'], type: 'Force Plate' },
    { date: '2024-02-18', athletes: ['Jake Martinez'], type: 'Force Plate' },
    { date: '2024-02-20', athletes: ['Emma Wilson'], type: 'Force Plate' },
  ];

  const weeklyStats = {
    totalWorkouts: 156,
    completedWorkouts: 142,
    averageCompletion: 91,
    totalPRs: 8,
    activeStreaks: 4,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-8">
      <div className="fixed inset-0 bg-gradient-to-br from-[#9BDDFF]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <main className="mx-auto max-w-[1800px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  Coach's Command Center
                </h1>
                <p className="text-sm sm:text-base text-white/60">
                  Monitor, celebrate, and support your athletes
                </p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl">
                <p className="text-xs text-purple-300 font-medium">DEMO MODE</p>
              </div>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all group">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-medium text-emerald-300">View Top Performers</span>
              </div>
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-300">Schedule Tests</span>
              </div>
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-sm font-medium text-purple-300">Send Message</span>
              </div>
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/30 rounded-xl hover:bg-pink-500/20 transition-all">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-pink-300">Create IG Story</span>
              </div>
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Left Column - 2/3 */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Weekly Overview */}
              <div className="glass-card shadow-premium rounded-2xl p-5 lg:p-6 border-l-4 border-l-[#9BDDFF]">
                <h2 className="text-lg font-bold text-white mb-4">Weekly Performance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-1">Total Workouts</p>
                    <p className="text-2xl font-bold text-white">{weeklyStats.totalWorkouts}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-emerald-500/20">
                    <p className="text-xs text-white/60 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-emerald-400">{weeklyStats.completedWorkouts}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-white/60 mb-1">Avg Rate</p>
                    <p className="text-2xl font-bold text-blue-400">{weeklyStats.averageCompletion}%</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-white/60 mb-1">Total PRs</p>
                    <p className="text-2xl font-bold text-purple-400">{weeklyStats.totalPRs}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-amber-500/20">
                    <p className="text-xs text-white/60 mb-1">Streaks</p>
                    <p className="text-2xl font-bold text-amber-400">{weeklyStats.activeStreaks}</p>
                  </div>
                </div>
              </div>

              {/* Shoutout Ready - Instagram Worthy Athletes */}
              <div className="glass-card shadow-premium rounded-2xl p-5 lg:p-6 border-l-4 border-l-pink-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-500/20 rounded-xl">
                      <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Social Media Ready</h2>
                      <p className="text-xs text-pink-300/70">Athletes crushing it - perfect for IG shoutouts!</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-lg hover:bg-pink-500/30 transition-all">
                    <span className="text-xs font-bold text-pink-300">Create Story</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {mockAthletes.filter(a => a.weeklyCompletion >= 88).map((athlete) => (
                    <div
                      key={athlete.id}
                      className="bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-pink-500/20 rounded-xl p-4 hover:border-pink-500/40 transition-all cursor-pointer group"
                      onClick={() => setSelectedAthlete(athlete)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">{athlete.initials}</span>
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{athlete.name}</p>
                            <p className="text-xs text-white/50">{athlete.position} • Class of {athlete.gradYear}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="px-2 py-1 bg-pink-500/20 rounded-lg">
                            <p className="text-xs font-bold text-pink-300">{athlete.weeklyCompletion}%</p>
                          </div>
                          {athlete.streak > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-amber-400">🔥</span>
                              <span className="text-xs font-bold text-amber-400">{athlete.streak}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {athlete.recentPR && (
                        <div className="bg-black/20 rounded-lg p-2 mb-2">
                          <p className="text-xs text-emerald-300 font-medium">Recent PR: {athlete.recentPR.exercise}</p>
                          <p className="text-xs text-white/50">{athlete.recentPR.weight}lbs • {athlete.recentPR.date}</p>
                        </div>
                      )}

                      {athlete.percentileChange > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span className="text-xs font-bold text-emerald-400">+{athlete.percentileChange}% Force Plate</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {athlete.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <button className="text-xs font-medium text-pink-300 hover:text-pink-200 transition-all">
                          📸 Generate Story
                        </button>
                        <button className="text-xs font-medium text-white/60 hover:text-white/80 transition-all">
                          View Profile →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Athletes - Sortable Grid */}
              <div className="glass-card shadow-premium rounded-2xl p-5 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">All Athletes</h2>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-all">
                      Sort by Performance
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {mockAthletes.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                      onClick={() => setSelectedAthlete(athlete)}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        athlete.weeklyCompletion >= 85 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                        athlete.weeklyCompletion >= 70 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        athlete.weeklyCompletion >= 50 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                        'bg-gradient-to-br from-red-400 to-red-600'
                      }`}>
                        <span className="text-sm font-bold text-white">{athlete.initials}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-white text-sm">{athlete.name}</p>
                          {athlete.trend === 'up' && (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          )}
                          {athlete.trend === 'down' && (
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>{athlete.position}</span>
                          <span>•</span>
                          <span>Class of {athlete.gradYear}</span>
                          {athlete.streak > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">🔥 {athlete.streak} day streak</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Completion Circle */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              className="text-white/10"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - athlete.weeklyCompletion / 100)}`}
                              className={
                                athlete.weeklyCompletion >= 85 ? 'text-emerald-400' :
                                athlete.weeklyCompletion >= 70 ? 'text-blue-400' :
                                athlete.weeklyCompletion >= 50 ? 'text-amber-400' :
                                'text-red-400'
                              }
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{athlete.weeklyCompletion}%</span>
                          </div>
                        </div>
                        <span className="text-xs text-white/50">This Week</span>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 */}
            <div className="space-y-4 sm:space-y-6">
              {/* Mini Calendar - Upcoming Tests */}
              <div className="glass-card shadow-premium rounded-2xl p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Upcoming Retests</h2>
                    <p className="text-xs text-blue-300/70">Force Plate assessments</p>
                  </div>
                </div>

                {/* Mini Calendar View */}
                <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/10">
                  <div className="text-center mb-2">
                    <p className="text-sm font-bold text-white">February 2024</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="text-xs text-white/40 font-medium">{day}</div>
                    ))}
                    {Array.from({ length: 28 }, (_, i) => {
                      const day = i + 1;
                      const hasTest = upcomingTests.some(test => {
                        const testDay = new Date(test.date).getDate();
                        return testDay === day;
                      });
                      const isToday = day === 10;

                      return (
                        <div
                          key={i}
                          className={`text-xs py-1 rounded ${
                            hasTest ? 'bg-blue-500/30 text-blue-300 font-bold border border-blue-500/50' :
                            isToday ? 'bg-white/10 text-white font-bold' :
                            'text-white/50'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Test Details */}
                <div className="space-y-2">
                  {upcomingTests.slice(0, 4).map((test, i) => (
                    <div key={i} className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-blue-300">{new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                          {test.athletes.length} athlete{test.athletes.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {test.athletes.map((name, j) => (
                          <p key={j} className="text-xs text-white/70">{name}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streak Leaders */}
              <div className="glass-card shadow-premium rounded-2xl p-5 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-xl">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Streak Leaders</h2>
                    <p className="text-xs text-amber-300/70">Consistency champions</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {mockAthletes
                    .filter(a => a.streak > 0)
                    .sort((a, b) => b.streak - a.streak)
                    .map((athlete, i) => (
                      <div key={athlete.id} className="flex items-center gap-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 font-bold text-amber-300 text-sm flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{athlete.name}</p>
                          <p className="text-xs text-white/50">{athlete.position}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-lg">🔥</span>
                          <span className="text-sm font-bold text-amber-400">{athlete.streak}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent Improvements */}
              <div className="glass-card shadow-premium rounded-2xl p-5 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Force Plate Gains</h2>
                    <p className="text-xs text-emerald-300/70">Recent improvements</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {mockAthletes
                    .filter(a => a.percentileChange > 0)
                    .sort((a, b) => b.percentileChange - a.percentileChange)
                    .map((athlete) => (
                      <div key={athlete.id} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-white">{athlete.name}</p>
                            <p className="text-xs text-white/50">{athlete.position}</p>
                          </div>
                          <div className="px-2 py-1 bg-emerald-500/20 rounded-lg">
                            <p className="text-sm font-bold text-emerald-300">+{athlete.percentileChange}%</p>
                          </div>
                        </div>

                        {/* Mini Sparkline */}
                        <div className="flex items-end gap-0.5 h-8">
                          {[65, 68, 70, 75, 78, 82, 85, 88].map((value, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-emerald-400/30 rounded-t"
                              style={{ height: `${(value / 100) * 100}%` }}
                            />
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-white/50">Last 8 tests</span>
                          <span className="text-xs text-emerald-400 font-medium">Trending up</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card shadow-premium rounded-2xl p-5">
                <h2 className="text-base font-bold text-white mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full p-3 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">View Analytics</p>
                        <p className="text-xs text-white/50">Team performance trends</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full p-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Send Group Message</p>
                        <p className="text-xs text-white/50">Motivate your team</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full p-3 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Export Report</p>
                        <p className="text-xs text-white/50">Weekly summary PDF</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Athlete Detail Modal (Optional) */}
      {selectedAthlete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            className="bg-[#0A0A0A] border border-white/20 rounded-2xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{selectedAthlete.initials}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAthlete.name}</h3>
                  <p className="text-sm text-white/50">{selectedAthlete.position} • Class of {selectedAthlete.gradYear}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAthlete(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-white/60 mb-2">Weekly Completion</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-white">{selectedAthlete.weeklyCompletion}%</p>
                  <p className="text-sm text-emerald-400 mb-1">+12% from last week</p>
                </div>
              </div>

              {selectedAthlete.recentPR && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-sm text-emerald-400 font-medium mb-1">Recent PR</p>
                  <p className="text-lg font-bold text-white">{selectedAthlete.recentPR.exercise}</p>
                  <p className="text-sm text-white/60">{selectedAthlete.recentPR.weight}lbs • {selectedAthlete.recentPR.date}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl hover:bg-pink-500/20 transition-all">
                  <p className="text-sm font-medium text-pink-300">📸 Create Story</p>
                </button>
                <button className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all">
                  <p className="text-sm font-medium text-blue-300">💬 Send Message</p>
                </button>
              </div>

              <Link
                href={`/dashboard/athletes/${selectedAthlete.id}`}
                className="block w-full p-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all text-center"
              >
                <p className="text-sm font-medium text-white">View Full Profile →</p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
