'use client';

/**
 * Pitching Profile View
 *
 * Displays pitching-specific metrics and training data for athletes with
 * pitching focus (Two Way Performance and Pitching Performance view types).
 */

interface PitchingProfileViewProps {
  athleteId: string;
  athleteName: string;
}

export default function PitchingProfileView({ athleteId, athleteName }: PitchingProfileViewProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header with greeting */}
      <div className="bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-transparent p-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Pitching Performance</h1>
          <p className="text-gray-400 text-sm">{athleteName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Velocity Tracking Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Velocity Metrics</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Track your pitch velocity, spin rate, and release metrics with radar gun and sensor integration.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Max Velocity</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">mph</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Avg Velocity</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">mph</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Pitch Count</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">This Week</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">pitches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pitch Type Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pitch Type Breakdown</h3>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🥎</div>
              <p className="text-gray-400">No pitch data recorded yet</p>
              <p className="text-gray-500 text-sm mt-2">Pitch type metrics will appear here after bullpen sessions</p>
            </div>
          </div>

          {/* Workload Management */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Workload Management</h3>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-400">No workload data available</p>
              <p className="text-gray-500 text-sm mt-2">Track pitch counts and recovery status to prevent overuse injuries</p>
            </div>
          </div>

          {/* Training Programs */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pitching Programs</h3>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400">No pitching programs assigned</p>
              <p className="text-gray-500 text-sm mt-2">Your coach will assign pitching-specific training programs here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
