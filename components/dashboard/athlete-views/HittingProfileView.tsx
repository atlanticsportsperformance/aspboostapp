'use client';

/**
 * Hitting Profile View
 *
 * Displays hitting-specific metrics and training data for athletes with
 * hitting focus (Two Way Performance and Hitting Performance view types).
 */

interface HittingProfileViewProps {
  athleteId: string;
  athleteName: string;
}

export default function HittingProfileView({ athleteId, athleteName }: HittingProfileViewProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header with greeting */}
      <div className="bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-transparent p-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Hitting Performance</h1>
          <p className="text-gray-400 text-sm">{athleteName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Blast Motion Integration Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Blast Motion Swing Data</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Track your bat speed, attack angle, and swing metrics with Blast Motion sensor integration.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Bat Speed</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">mph</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Attack Angle</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">degrees</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Swings</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">all time</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">This Week</p>
                    <p className="text-xl font-bold text-white">--</p>
                    <p className="text-xs text-gray-500">swings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">⚾</div>
              <p className="text-gray-400">No hitting sessions recorded yet</p>
              <p className="text-gray-500 text-sm mt-2">Sessions will appear here after syncing with Blast Motion</p>
            </div>
          </div>

          {/* Training Programs */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Hitting Programs</h3>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400">No hitting programs assigned</p>
              <p className="text-gray-500 text-sm mt-2">Your coach will assign hitting-specific training programs here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
