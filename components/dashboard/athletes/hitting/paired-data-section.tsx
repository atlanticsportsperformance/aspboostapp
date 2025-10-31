'use client';

import { useEffect, useState } from 'react';
import { PairedSession, PairedSessionsResponse } from '@/lib/paired-data/types';

interface PairedDataSectionProps {
  athleteId: string;
}

export default function PairedDataSection({ athleteId }: PairedDataSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PairedSessionsResponse | null>(null);
  const [selectedSession, setSelectedSession] = useState<PairedSession | null>(null);

  useEffect(() => {
    fetchPairedData();
  }, [athleteId]);

  const fetchPairedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/athletes/${athleteId}/paired-sessions`);

      if (!res.ok) {
        throw new Error('Failed to fetch paired data');
      }

      const data: PairedSessionsResponse = await res.json();
      setResponse(data);

      // Auto-select first paired session if available
      const firstPairedSession = data.data.find(s => s.blastSession && s.hittraxSession);
      if (firstPairedSession) {
        setSelectedSession(firstPairedSession);
      }
    } catch (err) {
      console.error('Error fetching paired data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400 text-sm">Error loading paired data: {error}</p>
      </div>
    );
  }

  if (!response || response.data.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No paired data available for this athlete.</p>
        <p className="text-gray-500 text-sm mt-2">
          Make sure they have both Blast Motion and HitTrax swings recorded on the same dates.
        </p>
      </div>
    );
  }

  const allSessions = response.data;
  const pairedSessions = allSessions.filter(s => s.blastSession && s.hittraxSession);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Sessions"
          value={response.stats.totalSessions}
          color="gray"
        />
        <StatCard
          label="Paired Sessions"
          value={response.stats.pairedSessions}
          color="green"
        />
        <StatCard
          label="Blast Only"
          value={response.stats.blastOnlySessions}
          color="blue"
        />
        <StatCard
          label="HitTrax Only"
          value={response.stats.hittraxOnlySessions}
          color="purple"
        />
      </div>

      {/* Session List */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">All Sessions</h3>
          <p className="text-xs text-gray-400 mt-0.5">Showing Blast, HitTrax, and paired sessions</p>
        </div>

        <div className="divide-y divide-gray-700">
          {allSessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400">No sessions found.</p>
            </div>
          ) : (
            allSessions.map((session) => (
              <button
                key={`${session.date}-${session.linkId || 'temp'}`}
                onClick={() => setSelectedSession(session)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                  selectedSession?.date === session.date ? 'bg-gray-700/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {(() => {
                          // Parse date string without timezone conversion
                          // session.date format: "2025-10-30"
                          const [year, month, day] = session.date.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        })()}
                      </p>
                      {/* Session type badge */}
                      {session.blastSession && session.hittraxSession ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded border border-green-500/30">
                          Paired
                        </span>
                      ) : session.blastSession ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          Blast Only
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                          HitTrax Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {session.blastSession?.swingCount || 0} Blast • {session.hittraxSession?.swingCount || 0} HitTrax
                    </p>
                  </div>
                  <div className="text-right">
                    {session.blastSession && session.hittraxSession && (
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          session.matchConfidence >= 0.8 ? 'bg-green-500' :
                          session.matchConfidence >= 0.5 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`} />
                        <p className="text-xs text-gray-400">
                          {(session.matchConfidence * 100).toFixed(0)}% match
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected Session Analysis */}
      {selectedSession && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Session Analysis - {(() => {
              const [year, month, day] = selectedSession.date.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            })()}
          </h3>

          {/* Combined Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Efficiency Ratio */}
            <MetricCard
              title="Bat Speed → Exit Velocity"
              subtitle="Efficiency Ratio"
              value={selectedSession.analysis.batSpeedToExitVeloRatio?.toFixed(2)}
              unit=""
              description="Typical range: 1.2-1.5"
              highlight={
                selectedSession.analysis.batSpeedToExitVeloRatio &&
                selectedSession.analysis.batSpeedToExitVeloRatio >= 1.2 &&
                selectedSession.analysis.batSpeedToExitVeloRatio <= 1.5
              }
            />

            {/* Average Bat Speed */}
            <MetricCard
              title="Average Bat Speed"
              subtitle="From Blast"
              value={selectedSession.analysis.avgBatSpeed?.toFixed(1)}
              unit="mph"
            />

            {/* Average Exit Velocity */}
            <MetricCard
              title="Average Exit Velocity"
              subtitle="From HitTrax"
              value={selectedSession.analysis.avgExitVelocity?.toFixed(1)}
              unit="mph"
            />

            {/* Angle Correlation */}
            <MetricCard
              title="Angle Correlation"
              subtitle="Attack ↔ Launch"
              value={selectedSession.analysis.angleCorrelation?.toFixed(2)}
              unit=""
              description="Range: -1 to 1 (higher = more correlated)"
            />

            {/* Hard Hit Rate */}
            <MetricCard
              title="Hard Hit Rate"
              subtitle="≥ 90 mph Exit Velocity"
              value={selectedSession.analysis.hardHitRate?.toFixed(0)}
              unit="%"
              highlight={
                selectedSession.analysis.hardHitRate &&
                selectedSession.analysis.hardHitRate >= 50
              }
            />

            {/* Bat Speed on Hard Hits */}
            <MetricCard
              title="Bat Speed on Hard Hits"
              subtitle="When EV ≥ 90 mph"
              value={selectedSession.analysis.avgBatSpeedOnHardHits?.toFixed(1)}
              unit="mph"
            />

            {/* Angle Difference */}
            <MetricCard
              title="Angle Difference"
              subtitle="Launch - Attack"
              value={selectedSession.analysis.angleDifference?.toFixed(1)}
              unit="°"
            />

            {/* Bat Speed Consistency */}
            <MetricCard
              title="Bat Speed Consistency"
              subtitle="Coefficient of Variation"
              value={selectedSession.analysis.batSpeedCV?.toFixed(2)}
              unit=""
              description="Lower = more consistent"
            />

            {/* Exit Velocity Consistency */}
            <MetricCard
              title="Exit Velocity Consistency"
              subtitle="Coefficient of Variation"
              value={selectedSession.analysis.exitVelocityCV?.toFixed(2)}
              unit=""
              description="Lower = more consistent"
            />
          </div>

          {/* Swing Count Comparison */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Swing Count Analysis</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">
                  {selectedSession.analysis.blastSwingCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">Blast Swings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {selectedSession.analysis.hittraxSwingCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">HitTrax Swings</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2">
                  {selectedSession.analysis.swingCountMatch ? (
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedSession.analysis.swingCountMatch ? 'Match' : 'Mismatch'}
                </p>
              </div>
            </div>
          </div>

          {/* Swing-by-Swing Detailed View */}
          {selectedSession.swingPairs && selectedSession.swingPairs.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h4 className="text-sm font-semibold text-white">Swing-by-Swing Details</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing all {selectedSession.swingPairs.length} swings with timestamp matching
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">#</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Blast Time</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium">Bat Speed</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium">Attack Angle</th>
                      <th className="px-3 py-2 text-center text-gray-400 font-medium">Match</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">HitTrax Time</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium">Exit Velo</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium">Launch Angle</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium">Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {selectedSession.swingPairs.map((pair, index) => {
                      const isPaired = pair.blastSwing && pair.hittraxSwing;
                      const matchQuality = isPaired && pair.confidence >= 0.8 ? 'excellent' :
                                         isPaired && pair.confidence >= 0.5 ? 'good' :
                                         isPaired ? 'fair' : 'none';

                      return (
                        <tr key={index} className="hover:bg-gray-700/30">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>

                          {/* Blast Data */}
                          <td className="px-3 py-2 text-white font-mono text-[11px]">
                            {pair.blastSwing ? pair.blastSwing.recorded_time : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-blue-400">
                            {pair.blastSwing?.bat_speed ? `${pair.blastSwing.bat_speed.toFixed(1)} mph` : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-blue-400">
                            {pair.blastSwing?.attack_angle ? `${pair.blastSwing.attack_angle.toFixed(1)}°` : '-'}
                          </td>

                          {/* Match Indicator */}
                          <td className="px-3 py-2 text-center">
                            {isPaired ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className={`w-2 h-2 rounded-full ${
                                  matchQuality === 'excellent' ? 'bg-green-500' :
                                  matchQuality === 'good' ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`} />
                                <span className="text-[10px] text-gray-500">
                                  {pair.timeDifferenceSeconds !== null ? `${pair.timeDifferenceSeconds.toFixed(1)}s` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>

                          {/* HitTrax Data */}
                          <td className="px-3 py-2 text-white font-mono text-[11px]">
                            {pair.hittraxSwing?.swing_timestamp ?
                              pair.hittraxSwing.swing_timestamp.split(' ')[1]?.split('.')[0] || '-'
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-purple-400">
                            {pair.hittraxSwing?.exit_velocity ? `${pair.hittraxSwing.exit_velocity.toFixed(1)} mph` : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-purple-400">
                            {pair.hittraxSwing?.launch_angle ? `${pair.hittraxSwing.launch_angle.toFixed(1)}°` : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-purple-400">
                            {pair.hittraxSwing?.distance ? `${pair.hittraxSwing.distance.toFixed(0)} ft` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-t border-gray-700 bg-gray-700/30">
                <div className="flex items-center gap-4 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Excellent match (&lt;1s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Good match (1-3s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Fair match (3-5s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Components

function StatCard({ label, value, color }: {
  label: string;
  value: string | number;
  color: 'gray' | 'green' | 'amber' | 'blue' | 'purple';
}) {
  const colorClasses = {
    gray: 'text-gray-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  value,
  unit,
  description,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  value: string | number | null | undefined;
  unit: string;
  description?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-gray-800/50 border rounded-lg p-4 ${
      highlight ? 'border-green-500/50 bg-green-500/5' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-white">{title}</p>
          <p className="text-[10px] text-gray-400">{subtitle}</p>
        </div>
        {highlight && (
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold text-white">
          {value !== null && value !== undefined ? value : '--'}
        </p>
        {unit && <p className="text-sm text-gray-400">{unit}</p>}
      </div>

      {description && (
        <p className="text-[10px] text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
