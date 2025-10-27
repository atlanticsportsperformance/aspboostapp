'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import MetricOverviewCards from './metric-overview-cards';

interface CompositeScoreSectionProps {
  athleteId: string;
}

interface TestTypeScore {
  test_type: string;
  test_name: string;
  latest_percentile: number | null;
  secondary_percentile?: number | null; // For IMTP Relative Strength
  metric_percentiles?: Record<string, number | null>; // Percentiles for each metric
  test_count: number;
  trend: 'up' | 'down' | 'neutral';
  metric_values?: {
    power?: number | null;
    peakPower?: number | null;
    peakForce?: number | null;
    rsi?: number | null;
    force?: number | null;
    netPeakForce?: number | null;
    relativeStrength?: number | null;
  };
}

export default function CompositeScoreSection({ athleteId }: CompositeScoreSectionProps) {
  const [loading, setLoading] = useState(true);
  const [valdProfileId, setValdProfileId] = useState<string | null>(null);
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

      // Get REAL percentiles from the percentile_lookup table via API
      const percentileResponse = await fetch(`/api/athletes/${athleteId}/vald/percentiles`);

      if (!percentileResponse.ok) {
        throw new Error('Failed to fetch percentiles');
      }

      const percentileData = await percentileResponse.json();

      // Map test names to detailed descriptions showing the metrics tracked
      const testNameMap: Record<string, string> = {
        'CMJ': 'CMJ - Bodyweight Relative Power',
        'SJ': 'Squat Jump - Bodyweight Relative Power',
        'HJ': 'Hop Test - Mean RSI',
        'PPU': 'Push-Up - Peak Force',
        'IMTP': 'IMTP - Net Peak Force & Relative Strength',
      };

      const scores: TestTypeScore[] = percentileData.test_scores.map((score: any) => ({
        test_type: score.test_type,
        test_name: testNameMap[score.test_name] || score.test_name,
        latest_percentile: score.latest_percentile,
        secondary_percentile: score.secondary_percentile,
        metric_percentiles: score.metric_percentiles,
        test_count: score.test_count,
        trend: score.trend,
        metric_values: score.metric_values,
      }));

      setTestScores(scores);
    } catch (err) {
      console.error('Error fetching composite data:', err);
    } finally {
      setLoading(false);
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
      {/* Key Force Metrics Overview */}
      {hasAnyTests ? (
        <MetricOverviewCards
          imtpNetPeakForce={testScores.find(s => s.test_type === 'imtp_tests')?.metric_values?.netPeakForce ?? null}
          imtpNetPeakForcePercentile={testScores.find(s => s.test_type === 'imtp_tests')?.latest_percentile ?? null}
          imtpRelativeStrength={testScores.find(s => s.test_type === 'imtp_tests')?.metric_values?.relativeStrength ?? null}
          imtpRelativeStrengthPercentile={testScores.find(s => s.test_type === 'imtp_tests')?.secondary_percentile ?? null}
          sjPeakPowerBW={testScores.find(s => s.test_type === 'sj_tests')?.metric_values?.power ?? null}
          sjPeakPowerBWPercentile={testScores.find(s => s.test_type === 'sj_tests')?.latest_percentile ?? null}
          ppuPeakForce={testScores.find(s => s.test_type === 'ppu_tests')?.metric_values?.force ?? null}
          ppuPeakForcePercentile={testScores.find(s => s.test_type === 'ppu_tests')?.metric_percentiles?.force ?? null}
          sjPeakPower={testScores.find(s => s.test_type === 'sj_tests')?.metric_values?.peakPower ?? null}
          sjPeakPowerPercentile={testScores.find(s => s.test_type === 'sj_tests')?.metric_percentiles?.peakPower ?? null}
          hjRSI={testScores.find(s => s.test_type === 'hj_tests')?.metric_values?.rsi ?? null}
          hjRSIPercentile={testScores.find(s => s.test_type === 'hj_tests')?.metric_percentiles?.rsi ?? null}
        />
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
