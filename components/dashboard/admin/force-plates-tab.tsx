'use client';

import { useState } from 'react';

export default function ForcePlatesTab() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [nightlySync, setNightlySync] = useState(true);
  const [syncResults, setSyncResults] = useState<any>(null);

  const handleBulkSync = async () => {
    if (!confirm('This will sync 365 days of Force Plate data for ALL athletes. This may take several minutes. Continue?')) {
      return;
    }

    setSyncing(true);
    setMessage('');
    setSyncResults(null);

    try {
      console.log('🔄 Starting bulk Force Plate sync...');
      const response = await fetch('/api/admin/force-plates/bulk-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 365 }),
      });

      const result = await response.json();
      console.log('Bulk sync response:', result);

      if (response.ok && result.success) {
        setMessage(result.message || 'Sync completed successfully!');
        setMessageType('success');
        setSyncResults(result);
      } else {
        const errorDetails = result.details ? ` - ${result.details}` : '';
        setMessage(`${result.error || 'Sync failed'}${errorDetails}`);
        setMessageType('error');
        console.error('Sync failed:', result);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setMessage(err instanceof Error ? err.message : 'Failed to sync');
      setMessageType('error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleNightlySync = async (enabled: boolean) => {
    setNightlySync(enabled);
    // TODO: Save to database or trigger Vercel cron job
    console.log('Nightly sync:', enabled ? 'Enabled' : 'Disabled');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Force Plate Management</h3>
        <p className="text-sm text-gray-400 mb-6">
          Manage VALD Force Plate data synchronization and automation settings
        </p>

        {/* Bulk Sync Section */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-2xl">📊</span>
              </div>
              <div>
                <h4 className="text-white font-medium">365-Day Full Sync</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Sync past year of Force Plate data for all athletes with VALD profiles
                </p>
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  <div>• Fetches CMJ, SJ, HJ, PPU, and IMTP tests</div>
                  <div>• Updates percentile history and rankings</div>
                  <div>• Calculates Force Profile composites</div>
                  <div>• May take 5-10 minutes for large teams</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleBulkSync}
            disabled={syncing}
            className="w-full px-6 py-3 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Syncing... This may take several minutes
              </span>
            ) : (
              'Start 365-Day Sync'
            )}
          </button>
        </div>

        {/* Sync Results */}
        {syncResults && (
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl mb-6">
            <h4 className="text-white font-medium mb-4">Sync Results</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-white">{syncResults.summary?.totalAthletes || 0}</div>
                <div className="text-xs text-gray-400">Total Athletes</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{syncResults.summary?.successfulSyncs || 0}</div>
                <div className="text-xs text-gray-400">Successful</div>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{syncResults.summary?.failedSyncs || 0}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{syncResults.summary?.totalTestsSynced || 0}</div>
                <div className="text-xs text-gray-400">Tests Synced</div>
              </div>
            </div>

            {syncResults.results && syncResults.results.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {syncResults.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white/5 rounded text-sm"
                  >
                    <span className="text-white">{result.athleteName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{result.syncedCount} tests</span>
                      {result.success ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              messageType === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message}
          </div>
        )}

        {/* Nightly Sync Automation */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-2xl">🌙</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Nightly Auto-Sync</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Automatically sync past 24 hours of Force Plate data every night at 2:00 AM EST
                </p>
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  <div>• Runs daily via Vercel Cron Job</div>
                  <div>• Syncs all athletes with VALD profiles</div>
                  <div>• Fetches tests from past 24 hours only</div>
                  <div>• Low overhead, completes in ~1-2 minutes</div>
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={nightlySync}
                onChange={(e) => handleToggleNightlySync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9BDDFF]"></div>
            </label>
          </div>
        </div>

        {/* Data Management */}
        <div className="mt-6 p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-400 font-bold text-2xl">🔧</span>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Rebuild Percentile Lookup (From Driveline Data)</h4>
              <p className="text-sm text-gray-400 mb-4">
                If you accidentally deleted the percentile_lookup table, this will rebuild it from the driveline_seed_data table.
                This restores the Driveline baseline percentiles (High School, College, Pro, Overall).
              </p>
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                  Show SQL Script
                </summary>
                <div className="mt-2 p-3 bg-black/50 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto max-h-60">
                  <pre>{`-- Run in Supabase SQL Editor
-- See: scripts/rebuild-percentile-lookup-from-driveline.sql

-- This rebuilds percentile_lookup from driveline_seed_data
-- Includes: SJ, CMJ, HJ, PPU, IMTP metrics
-- Creates: Play Level + Overall percentiles`}</pre>
                </div>
              </details>
              <a
                href="https://supabase.com/dashboard/project/_/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm transition-colors"
              >
                Open Supabase SQL Editor
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 font-bold text-2xl">⚠️</span>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Clear All Force Plate Data</h4>
              <p className="text-sm text-gray-400 mb-4">
                Delete all Force Plate tests, percentile history, and contributions to start fresh.
                <strong className="text-yellow-400"> Does NOT delete percentile_lookup (Driveline baseline data is preserved).</strong>
              </p>
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                  Show SQL Script
                </summary>
                <div className="mt-2 p-3 bg-black/50 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto">
                  <pre>{`-- Run in Supabase SQL Editor
-- See: scripts/clear-all-force-plate-data.sql

DELETE FROM cmj_tests;
DELETE FROM sj_tests;
DELETE FROM hj_tests;
DELETE FROM ppu_tests;
DELETE FROM imtp_tests;
DELETE FROM athlete_percentile_history;
DELETE FROM athlete_percentile_contributions;

-- ⚠️ DOES NOT DELETE percentile_lookup!
-- It contains Driveline baseline data

UPDATE athletes SET vald_synced_at = NULL;`}</pre>
                </div>
              </details>
              <a
                href="https://supabase.com/dashboard/project/_/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors"
              >
                Open Supabase SQL Editor
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
