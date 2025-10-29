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
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchValdStatus();

    // OPTIMIZATION: Prefetch CMJ data immediately since it's commonly accessed
    // This happens in the background while user views the overview
    if (athleteId) {
      fetch(`/api/athletes/${athleteId}/vald/percentile-history?test_type=CMJ`)
        .then(res => res.json())
        .catch(err => console.log('Prefetch CMJ failed (non-critical):', err));
    }
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

  async function handleSync(daysBack: number = 180) {
    if (!valdProfileId) return;

    try {
      setSyncing(true);
      const response = await fetch(`/api/athletes/${athleteId}/vald/sync?daysBack=${daysBack}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Sync failed');
      }

      alert(`✅ Success! Synced ${data.tests_synced} test(s) from last ${daysBack} days`);
      // Refresh the current view
      window.location.reload();
    } catch (err) {
      console.error('Sync error:', err);
      alert(`❌ Sync failed:\n\n${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#0A0A0A] p-8' : 'space-y-2'}`}>
      {/* Fullscreen Header with Athlete Name and Tabs */}
      {isFullscreen && athleteName && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">{athleteName}</h1>
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
          </div>

          {/* Exit Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-all border border-white/10 hover:scale-105 hover:shadow-lg hover:shadow-[#9BDDFF]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </button>
        </div>
      )}

      {/* Header: Title + Tabs + Sync Button (non-fullscreen) */}
      {!isFullscreen && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 mb-2">
          {/* Left: Title (only show on Force Overview on desktop) */}
          <div className="hidden md:block flex-shrink-0">
            {viewMode === 'composite' && (
              <h2 className="font-bold text-white text-xl">Force Overview</h2>
            )}
          </div>

          {/* Mobile: Dropdown + Sync Button */}
          <div className="md:hidden w-full flex items-center gap-2">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]/50"
            >
              <option value="composite">Force Overview</option>
              <option value="cmj">CMJ</option>
              <option value="sj">SJ</option>
              <option value="hj">HJ</option>
              <option value="ppu">PPU</option>
              <option value="imtp">IMTP</option>
              <option value="history">Sync History</option>
            </select>

            {/* Sync Buttons (Mobile) */}
            <div className="flex gap-1">
              <button
                onClick={() => handleSync(30)}
                disabled={syncing || !valdProfileId}
                className={`px-2 py-2 rounded-md font-medium text-xs transition-all whitespace-nowrap flex items-center gap-1 ${
                  valdProfileId
                    ? 'bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black shadow-lg shadow-[#9BDDFF]/20'
                    : 'border border-white/20 bg-black/20 text-gray-400 cursor-not-allowed'
                } ${syncing ? 'opacity-50' : ''}`}
                title="Sync last 30 days"
              >
                {syncing ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>30d</span>
              </button>
              <button
                onClick={() => handleSync(180)}
                disabled={syncing || !valdProfileId}
                className={`px-2 py-2 rounded-md font-medium text-xs transition-all whitespace-nowrap flex items-center gap-1 ${
                  valdProfileId
                    ? 'border border-[#9BDDFF] bg-[#9BDDFF]/10 hover:bg-[#9BDDFF]/20 text-[#9BDDFF]'
                    : 'border border-white/20 bg-black/20 text-gray-400 cursor-not-allowed'
                } ${syncing ? 'opacity-50' : ''}`}
                title="Full sync - last 180 days"
              >
                {syncing ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>180d</span>
              </button>
            </div>
          </div>

          {/* Desktop: Tabs + Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex gap-1 bg-black/40 rounded-lg p-1">
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

            {/* Present Button (Desktop only) */}
            {viewMode === 'composite' && (
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Present
              </button>
            )}

            {/* Sync Buttons (Desktop) */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSync(30)}
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
                    Sync 30d
                  </>
                )}
              </button>
              <button
                onClick={() => handleSync(180)}
                disabled={syncing || !valdProfileId}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                  valdProfileId
                    ? 'border border-[#9BDDFF] bg-[#9BDDFF]/10 hover:bg-[#9BDDFF]/20 text-[#9BDDFF]'
                    : 'border border-white/20 bg-black/20 text-gray-400 cursor-not-allowed'
                } ${syncing ? 'opacity-50' : ''}`}
                title="Full historical sync - 180 days"
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
                    Full Sync 180d
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Sections */}
      {viewMode === 'composite' && (
        <ForceOverviewSection
          athleteId={athleteId}
          isFullscreen={isFullscreen}
          onNavigateToTest={(testType) => setViewMode(testType)}
        />
      )}
      {viewMode === 'cmj' && <IndividualTestSection athleteId={athleteId} testType="CMJ" playLevel={playLevel} />}
      {viewMode === 'sj' && <IndividualTestSection athleteId={athleteId} testType="SJ" playLevel={playLevel} />}
      {viewMode === 'hj' && <IndividualTestSection athleteId={athleteId} testType="HJ" playLevel={playLevel} />}
      {viewMode === 'ppu' && <IndividualTestSection athleteId={athleteId} testType="PPU" playLevel={playLevel} />}
      {viewMode === 'imtp' && <IndividualTestSection athleteId={athleteId} testType="IMTP" playLevel={playLevel} />}
      {viewMode === 'history' && <SyncHistorySection athleteId={athleteId} />}
    </div>
  );
}
