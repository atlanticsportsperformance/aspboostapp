'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CMJSectionProps {
  athleteId: string;
}

interface CMJTest {
  id: string;
  recorded_utc: string;
  jump_height_trial_value: number | null;
  jump_height_trial_unit: string | null;
  peak_takeoff_force_trial_value: number | null;
  peak_landing_force_trial_value: number | null;
  eccentric_mean_power_trial_value: number | null;
  concentric_mean_power_trial_value: number | null;
  modified_rsi_trial_value: number | null;
  // Add more key metrics as needed
}

export default function CMJSection({ athleteId }: CMJSectionProps) {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<CMJTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<CMJTest | null>(null);

  useEffect(() => {
    fetchCMJTests();
  }, [athleteId]);

  async function fetchCMJTests() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('cmj_tests')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('recorded_utc', { ascending: false });

      if (error) throw error;
      setTests(data || []);
      if (data && data.length > 0) {
        setSelectedTest(data[0]); // Select most recent test by default
      }
    } catch (err) {
      console.error('Error fetching CMJ tests:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading CMJ data...</p>
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg p-12 border border-white/10 border-dashed text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No CMJ Tests Found</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          No Counter Movement Jump tests have been synced yet. Sync VALD data to see test results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Counter Movement Jump (CMJ)</h3>
          <p className="text-gray-400 text-sm mt-1">
            {tests.length} test{tests.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {/* Test Selector */}
        <select
          value={selectedTest?.id || ''}
          onChange={(e) => {
            const test = tests.find(t => t.id === e.target.value);
            setSelectedTest(test || null);
          }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
        >
          {tests.map((test) => (
            <option key={test.id} value={test.id} className="bg-[#0A0A0A]">
              {new Date(test.recorded_utc).toLocaleDateString()} - {new Date(test.recorded_utc).toLocaleTimeString()}
            </option>
          ))}
        </select>
      </div>

      {selectedTest && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#9BDDFF]/20 to-[#A08845]/10 border border-[#9BDDFF]/30 rounded-lg p-5">
              <p className="text-sm text-gray-400 mb-2">Jump Height</p>
              <p className="text-4xl font-bold text-white">
                {selectedTest.jump_height_trial_value !== null
                  ? selectedTest.jump_height_trial_value.toFixed(2)
                  : '--'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTest.jump_height_trial_unit || 'm'}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <p className="text-sm text-gray-400 mb-2">Peak Takeoff Force</p>
              <p className="text-4xl font-bold text-white">
                {selectedTest.peak_takeoff_force_trial_value !== null
                  ? selectedTest.peak_takeoff_force_trial_value.toFixed(0)
                  : '--'}
              </p>
              <p className="text-sm text-gray-500 mt-1">N</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <p className="text-sm text-gray-400 mb-2">Concentric Power</p>
              <p className="text-4xl font-bold text-white">
                {selectedTest.concentric_mean_power_trial_value !== null
                  ? selectedTest.concentric_mean_power_trial_value.toFixed(0)
                  : '--'}
              </p>
              <p className="text-sm text-gray-500 mt-1">W</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <p className="text-sm text-gray-400 mb-2">Modified RSI</p>
              <p className="text-4xl font-bold text-white">
                {selectedTest.modified_rsi_trial_value !== null
                  ? selectedTest.modified_rsi_trial_value.toFixed(2)
                  : '--'}
              </p>
              <p className="text-sm text-gray-500 mt-1">ratio</p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Additional Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Peak Landing Force</p>
                <p className="text-xl font-bold text-white">
                  {selectedTest.peak_landing_force_trial_value !== null
                    ? selectedTest.peak_landing_force_trial_value.toFixed(0)
                    : '--'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">N</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Eccentric Power</p>
                <p className="text-xl font-bold text-white">
                  {selectedTest.eccentric_mean_power_trial_value !== null
                    ? selectedTest.eccentric_mean_power_trial_value.toFixed(0)
                    : '--'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">W</p>
              </div>

              {/* Add more metrics as needed */}
            </div>
          </div>

          {/* Test History Chart Placeholder */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h4 className="text-lg font-semibold text-white mb-4">Jump Height History</h4>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Chart visualization coming soon
            </div>
          </div>
        </>
      )}
    </div>
  );
}
