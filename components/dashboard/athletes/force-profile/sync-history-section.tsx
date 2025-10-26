'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SyncHistorySectionProps {
  athleteId: string;
}

interface SyncEvent {
  id: string;
  synced_at: string;
  test_count: number;
  test_types: string[];
}

export default function SyncHistorySection({ athleteId }: SyncHistorySectionProps) {
  const [loading, setLoading] = useState(true);
  const [valdProfileId, setValdProfileId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSyncHistory();
  }, [athleteId]);

  async function fetchSyncHistory() {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get athlete VALD info
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('vald_profile_id, vald_synced_at')
        .eq('id', athleteId)
        .single();

      if (athleteError) throw athleteError;

      setValdProfileId(athlete?.vald_profile_id || null);
      setLastSync(athlete?.vald_synced_at || null);

      // Get test counts for each type
      const testTypes = [
        { key: 'cmj', table: 'cmj_tests', label: 'CMJ' },
        { key: 'sj', table: 'sj_tests', label: 'SJ' },
        { key: 'hj', table: 'hj_tests', label: 'HJ' },
        { key: 'ppu', table: 'ppu_tests', label: 'PPU' },
        { key: 'imtp', table: 'imtp_tests', label: 'IMTP' },
      ];

      const counts: Record<string, number> = {};

      for (const type of testTypes) {
        const { count, error } = await supabase
          .from(type.table)
          .select('*', { count: 'exact', head: true })
          .eq('athlete_id', athleteId);

        if (!error) {
          counts[type.label] = count || 0;
        }
      }

      setTestCounts(counts);

      // Mock sync history (replace with real data from vald_sync_history table if you have one)
      const mockEvents: SyncEvent[] = [];
      if (lastSync) {
        mockEvents.push({
          id: '1',
          synced_at: lastSync,
          test_count: Object.values(counts).reduce((sum, c) => sum + c, 0),
          test_types: Object.keys(counts).filter(k => counts[k] > 0),
        });
      }

      setSyncEvents(mockEvents);
    } catch (err) {
      console.error('Error fetching sync history:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading sync history...</p>
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
              This athlete doesn't have a VALD ForceDecks profile linked. No sync history available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalTests = Object.values(testCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#9BDDFF]/20 to-[#7BC5F0]/10 border border-[#9BDDFF]/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-400">VALD Profile ID</h3>
          </div>
          <p className="text-lg font-mono text-white truncate">{valdProfileId}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-400">Last Synced</h3>
          </div>
          <p className="text-lg text-white">
            {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-400">Total Tests</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalTests}</p>
        </div>
      </div>

      {/* Test Type Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Tests by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(testCounts).map(([type, count]) => (
            <div key={type} className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-[#9BDDFF]">{count}</p>
              <p className="text-sm text-gray-400 mt-1">{type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Timeline */}
      {syncEvents.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Sync Timeline</h3>
          <div className="space-y-3">
            {syncEvents.map((event) => (
              <div key={event.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">
                        Synced {event.test_count} test{event.test_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-400">
                        Test types: {event.test_types.join(', ')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(event.synced_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-12 border border-white/10 border-dashed text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Sync History</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            No data has been synced from VALD yet. Click "Sync Latest Tests" in the Composite Score tab to pull data.
          </p>
        </div>
      )}

      {/* How to Sync Section */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">How to Sync VALD Data</h4>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal ml-4">
              <li>Athlete completes tests on VALD ForceDecks system</li>
              <li>Tests are automatically uploaded to VALD cloud</li>
              <li>Click "Sync Latest Tests" button in any Force Profile tab</li>
              <li>System retrieves and stores test data in your database</li>
              <li>View detailed metrics and history in each test section</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
