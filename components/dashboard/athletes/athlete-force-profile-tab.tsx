'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ForceOverviewSection from './force-profile/force-overview-section';
import IndividualTestSection from './force-profile/individual-test-section';
import SyncHistorySection from './force-profile/sync-history-section';

interface ForceProfileTabProps {
  athleteId: string;
  athleteName?: string;
}

type ViewMode = 'composite' | 'cmj' | 'sj' | 'hj' | 'ppu' | 'imtp' | 'history';

export default function ForceProfileTab({ athleteId, athleteName }: ForceProfileTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('composite');
  const [valdProfileId, setValdProfileId] = useState<string | null>(null);
  const [playLevel, setPlayLevel] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchValdStatus();
  }, [athleteId]);

  async function fetchValdStatus() {
    const supabase = createClient();
    const { data: athlete } = await supabase
      .from('athletes')
      .select('vald_profile_id, play_level')
      .eq('id', athleteId)
      .single();

    setValdProfileId(athlete?.vald_profile_id || null);
    setPlayLevel(athlete?.play_level || 'NCAA D1');
  }

  async function handleSync() {
    if (!valdProfileId) return;

    try {
      setSyncing(true);
      const response = await fetch(`/api/athletes/${athleteId}/vald/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Sync failed');
      }

      alert(`✅ Success! Synced ${data.tests_synced} test(s)`);
      // Refresh the current view
      window.location.reload();
    } catch (err) {
      console.error('Sync error:', err);
      alert(`❌ Sync failed:\n\n${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Header: Just Tabs + Sync Button */}
      <div className="flex items-center justify-end gap-2">
          <div className="flex gap-1 bg-black/40 rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setViewMode('composite')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'composite'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Force Overview
          </button>
        <button
          onClick={() => setViewMode('cmj')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'cmj'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          CMJ
        </button>
        <button
          onClick={() => setViewMode('sj')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'sj'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          SJ
        </button>
        <button
          onClick={() => setViewMode('hj')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'hj'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          HJ
        </button>
        <button
          onClick={() => setViewMode('ppu')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'ppu'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          PPU
        </button>
        <button
          onClick={() => setViewMode('imtp')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'imtp'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          IMTP
        </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'history'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Sync History
          </button>
          </div>

          {/* Sync Button */}
          <button
          onClick={handleSync}
          disabled={syncing || !valdProfileId}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
            valdProfileId
              ? 'bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black shadow-lg shadow-[#9BDDFF]/20'
              : 'border border-white/20 bg-black/20 text-gray-400 cursor-not-allowed'
          } ${syncing ? 'opacity-50' : ''}`}
        >
          {syncing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </>
          )}
          </button>
      </div>

      {/* Content Sections */}
      {viewMode === 'composite' && (
        <ForceOverviewSection
          athleteId={athleteId}
          athleteName={athleteName}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode as ViewMode)}
        />
      )}
      {viewMode === 'cmj' && <IndividualTestSection athleteId={athleteId} testType="CMJ" playLevel={playLevel} />}
      {viewMode === 'sj' && <IndividualTestSection athleteId={athleteId} testType="SJ" playLevel={playLevel} />}
      {viewMode === 'hj' && <IndividualTestSection athleteId={athleteId} testType="HJ" playLevel={playLevel} />}
      {viewMode === 'ppu' && <IndividualTestSection athleteId={athleteId} testType="PPU" playLevel={playLevel} />}
      {viewMode === 'imtp' && <IndividualTestSection athleteId={athleteId} testType="IMTP" playLevel={playLevel} />}
      {viewMode === 'history' && <SyncHistorySection athleteId={athleteId} />
    </div>
  );
}
