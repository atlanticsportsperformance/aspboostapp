'use client';

import { useState } from 'react';
import CompositeScoreSection from './force-profile/composite-score-section';
import CMJSection from './force-profile/cmj-section';
import SJSection from './force-profile/sj-section';
import HJSection from './force-profile/hj-section';
import PPUSection from './force-profile/ppu-section';
import IMTPSection from './force-profile/imtp-section';
import SyncHistorySection from './force-profile/sync-history-section';

interface ForceProfileTabProps {
  athleteId: string;
}

type ViewMode = 'composite' | 'cmj' | 'sj' | 'hj' | 'ppu' | 'imtp' | 'history';

export default function ForceProfileTab({ athleteId }: ForceProfileTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('composite');

  return (
    <div className="space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Force Profile</h2>
          <p className="text-gray-400 text-sm">VALD ForceDecks biomechanical testing data</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 bg-black/40 rounded-lg p-1 overflow-x-auto">
        <button
          onClick={() => setViewMode('composite')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
            viewMode === 'composite'
              ? 'bg-[#9BDDFF] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          Composite Score
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

      {/* Content Sections */}
      {viewMode === 'composite' && <CompositeScoreSection athleteId={athleteId} />}
      {viewMode === 'cmj' && <CMJSection athleteId={athleteId} />}
      {viewMode === 'sj' && <SJSection athleteId={athleteId} />}
      {viewMode === 'hj' && <HJSection athleteId={athleteId} />}
      {viewMode === 'ppu' && <PPUSection athleteId={athleteId} />}
      {viewMode === 'imtp' && <IMTPSection athleteId={athleteId} />}
      {viewMode === 'history' && <SyncHistorySection athleteId={athleteId} />}
    </div>
  );
}
