'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ForceOverviewRadar from './force-overview-radar';
import ForceOverviewMetricCard from './force-overview-metric-card';

interface ForceOverviewSectionProps {
  athleteId: string;
}

interface RadarDataPoint {
  name: string;
  displayName: string;
  current: { percentile: number; value: number; date: string } | null;
  previous: { percentile: number; value: number; date: string } | null;
}

export default function ForceOverviewSection({ athleteId }: ForceOverviewSectionProps) {
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
  const [compositeScore, setCompositeScore] = useState<{
    current: { percentile: number; date: string } | null;
    previous: { percentile: number; date: string } | null;
  } | null>(null);
  const [playLevel, setPlayLevel] = useState<string>('');

  useEffect(() => {
    fetchRadarData();
  }, [athleteId]);

  async function fetchRadarData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/athletes/${athleteId}/vald/charts/radar`);

      if (!response.ok) {
        throw new Error('Failed to fetch radar data');
      }

      const data = await response.json();
      setRadarData(data.metrics);
      setCompositeScore(data.compositeScore);
      setPlayLevel(data.playLevel);
    } catch (err) {
      console.error('Error fetching radar data:', err);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading force profile...</p>
        </div>
      </div>
    );
  }

  if (!compositeScore?.current) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-medium text-yellow-500 mb-1">No Force Profile Data</h3>
            <p className="text-gray-400 text-sm">
              This athlete needs to complete all 4 test types (SJ, HJ, PPU, IMTP) to generate a Force Profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getZoneColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-400';
    if (percentile >= 50) return 'text-[#9BDDFF]';
    if (percentile >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getZoneLabel = (percentile: number): string => {
    if (percentile >= 75) return 'ELITE';
    if (percentile >= 50) return 'OPTIMIZE';
    if (percentile >= 25) return 'SHARPEN';
    return 'BUILD';
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#0A0A0A] p-8' : ''}`}>
      {/* Compact Header */}
      <div className="flex items-center gap-3 mb-4 mt-3">
        <h2 className={`font-bold text-white ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
          Force Overview
        </h2>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          getZoneLabel(compositeScore.current.percentile) === 'ELITE' ? 'bg-green-500/20 text-green-400' :
          getZoneLabel(compositeScore.current.percentile) === 'OPTIMIZE' ? 'bg-blue-500/20 text-[#9BDDFF]' :
          getZoneLabel(compositeScore.current.percentile) === 'SHARPEN' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {getZoneLabel(compositeScore.current.percentile)}
        </span>
        <span className="text-xs text-gray-400">
          — Comprehensive force production analysis across 6 key biomechanical metrics vs {playLevel} athletes
        </span>
      </div>

      {/* Main Layout: Radar + Cards */}
      <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-[1.2fr_1fr] h-[calc(100vh-180px)]' : 'grid-cols-1 lg:grid-cols-[1.2fr_1fr] max-h-[calc(100vh-300px)]'}`}>
        {/* Left: Radar Chart */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl border border-white/10 p-3 flex flex-col relative backdrop-blur-xl shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-left duration-500">
          {/* Fullscreen Button - Top Right */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-all border border-white/10 hover:scale-105 hover:shadow-lg hover:shadow-[#9BDDFF]/20"
          >
            {isFullscreen ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Present
              </>
            )}
          </button>

          <div className={`flex-1 ${isFullscreen ? 'min-h-[600px]' : 'h-full'}`}>
            <ForceOverviewRadar
              data={radarData}
              compositeScore={compositeScore.current.percentile}
            />
          </div>

          {/* Legend - Compact */}
          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <span className="text-[10px] text-gray-400">Current</span>
            </div>
            {compositeScore.previous && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-1" viewBox="0 0 16 4">
                  <line x1="0" y1="2" x2="16" y2="2" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="3,3" />
                </svg>
                <span className="text-[10px] text-gray-400">Previous</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Metric Cards with stagger animation */}
        <div className={`grid gap-3 ${isFullscreen ? 'grid-cols-2 auto-rows-fr' : 'grid-cols-1 md:grid-cols-2'} content-start`}>
          {radarData.map((metric, index) => (
            <div
              key={metric.name}
              className="animate-in fade-in slide-in-from-right duration-500"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <ForceOverviewMetricCard
                displayName={metric.displayName}
                current={metric.current}
                previous={metric.previous}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Composite Score Footer - only show if dates are actually different */}
      {compositeScore.previous && compositeScore.previous.date !== compositeScore.current.date && (
        <div className="mt-4 bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl border border-white/10 p-4 backdrop-blur-xl shadow-lg shadow-black/20 animate-in fade-in slide-in-from-bottom duration-500 hidden md:block">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-white/80 font-semibold">Composite Score Change</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">
                {new Date(compositeScore.previous.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(compositeScore.current.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-500">{Math.round(compositeScore.previous.percentile)}</div>
                <div className="text-[10px] text-gray-600 font-medium">Previous</div>
              </div>
              <div className="text-2xl text-gray-600">→</div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getZoneColor(compositeScore.current.percentile)}`}>
                  {Math.round(compositeScore.current.percentile)}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">Current</div>
              </div>
              <div className={`text-right px-3 py-2 rounded-xl ${
                compositeScore.current.percentile > compositeScore.previous.percentile
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <div className="text-2xl font-bold">
                  {compositeScore.current.percentile > compositeScore.previous.percentile ? '+' : ''}
                  {(compositeScore.current.percentile - compositeScore.previous.percentile).toFixed(1)}
                </div>
                <div className="text-[10px] font-medium">Change</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
