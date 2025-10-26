'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CompositeScoreSectionProps {
  athleteId: string;
}

interface TestTypeScore {
  test_type: string;
  test_name: string;
  latest_percentile: number | null;
  test_count: number;
  trend: 'up' | 'down' | 'neutral';
}

export default function CompositeScoreSection({ athleteId }: CompositeScoreSectionProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [compositeScore, setCompositeScore] = useState<number | null>(null);
  const [valdProfileId, setValdProfileId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [testScores, setTestScores] = useState<TestTypeScore[]>([]);

  useEffect(() => {
    fetchCompositeData();
  }, [athleteId]);

  async function fetchCompositeData() {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get athlete VALD info
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('vald_profile_id, vald_composite_score, vald_synced_at')
        .eq('id', athleteId)
        .single();

      if (athleteError) throw athleteError;

      setValdProfileId(athlete?.vald_profile_id || null);
      setCompositeScore(athlete?.vald_composite_score || null);
      setLastSyncedAt(athlete?.vald_synced_at || null);

      // Get scores for each test type (mock data for now - replace with real percentile queries)
      const testTypes = [
        { test_type: 'cmj_tests', test_name: 'Counter Movement Jump' },
        { test_type: 'sj_tests', test_name: 'Squat Jump' },
        { test_type: 'hj_tests', test_name: 'Hop Test' },
        { test_type: 'ppu_tests', test_name: 'Push-Up' },
        { test_type: 'imtp_tests', test_name: 'IMTP' },
      ];

      const scores: TestTypeScore[] = [];

      for (const type of testTypes) {
        const { data: tests, count } = await supabase
          .from(type.test_type)
          .select('*', { count: 'exact' })
          .eq('athlete_id', athleteId)
          .order('recorded_utc', { ascending: false })
          .limit(2);

        scores.push({
          test_type: type.test_type,
          test_name: type.test_name,
          latest_percentile: tests && tests.length > 0 ? Math.floor(Math.random() * 100) : null, // TODO: Get real percentile
          test_count: count || 0,
          trend: tests && tests.length >= 2 ? 'up' : 'neutral', // TODO: Calculate real trend
        });
      }

      setTestScores(scores);
    } catch (err) {
      console.error('Error fetching composite data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);

      const response = await fetch(`/api/athletes/${athleteId}/vald/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      alert(`✅ Success! Synced ${data.tests_synced} test(s)`);
      await fetchCompositeData();
    } catch (err) {
      console.error('Sync error:', err);
      alert(`❌ Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading composite score...</p>
        </div>
      </div>
    );
  }

  if (!valdProfileId) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-medium text-yellow-500 mb-1">No VALD Profile Linked</h3>
            <p className="text-gray-400 text-sm">
              This athlete doesn't have a VALD ForceDecks profile linked. To view force profile data, link a VALD profile in the athlete settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyTests = testScores.some(s => s.test_count > 0);
  const averagePercentile = testScores
    .filter(s => s.latest_percentile !== null)
    .reduce((sum, s) => sum + (s.latest_percentile || 0), 0) / testScores.filter(s => s.latest_percentile !== null).length || 0;

  return (
    <div className="space-y-6">
      {/* Header Card with Composite Score */}
      <div className="bg-gradient-to-br from-[#9BDDFF]/20 to-[#7BC5F0]/10 border border-[#9BDDFF]/30 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Composite Score */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Overall Force Profile</h3>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Composite Score</p>
                <p className="text-5xl font-bold text-white">
                  {compositeScore !== null ? compositeScore.toFixed(1) : '--'}
                </p>
              </div>
              {averagePercentile > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-gray-400">Avg Percentile</p>
                  <p className="text-2xl font-bold text-[#9BDDFF]">
                    {Math.round(averagePercentile)}th
                  </p>
                </div>
              )}
            </div>
            {lastSyncedAt && (
              <p className="text-xs text-gray-500 mt-3">
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-all flex items-center gap-2 justify-center"
          >
            {syncing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Latest Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Type Breakdown */}
      {hasAnyTests ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Test Type Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testScores.map((score) => (
              <div
                key={score.test_type}
                className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-[#9BDDFF]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">{score.test_name}</h4>
                  {score.trend === 'up' && (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                  {score.trend === 'down' && (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                </div>

                {score.latest_percentile !== null ? (
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold text-[#9BDDFF]">
                        {score.latest_percentile}
                      </span>
                      <span className="text-lg text-gray-400 mb-1">th percentile</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {score.test_count} test{score.test_count !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">No tests recorded</p>
                    <p className="text-xs text-gray-600">Sync tests to see data</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-12 border border-white/10 border-dashed text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Test Data Yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
            This athlete has a VALD profile but hasn't completed any tests yet. Click "Sync Latest Tests" to check for new data from VALD ForceDecks.
          </p>
        </div>
      )}

      {/* Quick Stats Grid */}
      {hasAnyTests && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-gray-400 mb-1">Total Tests</p>
            <p className="text-2xl font-bold text-white">
              {testScores.reduce((sum, s) => sum + s.test_count, 0)}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-gray-400 mb-1">Test Types</p>
            <p className="text-2xl font-bold text-white">
              {testScores.filter(s => s.test_count > 0).length}/5
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-gray-400 mb-1">Improving</p>
            <p className="text-2xl font-bold text-green-400">
              {testScores.filter(s => s.trend === 'up').length}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-gray-400 mb-1">Declining</p>
            <p className="text-2xl font-bold text-red-400">
              {testScores.filter(s => s.trend === 'down').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
