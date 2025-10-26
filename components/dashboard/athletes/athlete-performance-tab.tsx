'use client';

import { useState } from 'react';
import { MaxTrackerPanel } from '@/components/dashboard/athletes/max-tracker-panel';
import MaxTrendsDashboard from '@/components/dashboard/athletes/max-trends-dashboard';
import VolumeTrackingDashboard from '@/components/dashboard/athletes/volume-tracking-dashboard';
import TrainingTab from '@/components/dashboard/athletes/athlete-training-tab';

interface PerformanceTabProps {
  athleteId: string;
}

type ViewMode = 'trends' | 'records' | 'volume' | 'history';

export default function AthletePerformanceTab({ athleteId }: PerformanceTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('trends');

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Programming KPIs</h2>
          <p className="text-gray-400 text-sm">Track maxes, volume, progression, and training history</p>
        </div>

        <div className="flex gap-2 bg-black/40 rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setViewMode('trends')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'trends'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Max Trends
          </button>
          <button
            onClick={() => setViewMode('records')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'records'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Personal Records
          </button>
          <button
            onClick={() => setViewMode('volume')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'volume'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
              viewMode === 'history'
                ? 'bg-[#9BDDFF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Training History
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'trends' && <MaxTrendsDashboard athleteId={athleteId} />}
      {viewMode === 'records' && <MaxTrackerPanel athleteId={athleteId} />}
      {viewMode === 'volume' && <VolumeTrackingDashboard athleteId={athleteId} />}
      {viewMode === 'history' && <TrainingTab athleteId={athleteId} />}
    </div>
  );
}
