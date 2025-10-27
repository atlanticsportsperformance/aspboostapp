'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BodyweightHistoryModalProps {
  athleteId: string;
  onClose: () => void;
}

interface BodyweightDataPoint {
  date: string;
  weight_kg: number;
  weight_lbs: number;
  test_id: string;
}

interface BodyweightHistory {
  athlete: {
    id: string;
    name: string;
    current_weight_lbs: number | null;
  };
  history: BodyweightDataPoint[];
  stats: {
    total_measurements: number;
    avg_weight_lbs: number | null;
    min_weight_lbs: number | null;
    max_weight_lbs: number | null;
    weight_change_lbs: number | null;
  };
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

export function BodyweightHistoryModal({ athleteId, onClose }: BodyweightHistoryModalProps) {
  const [data, setData] = useState<BodyweightHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchBodyweightHistory();
  }, [athleteId]);

  useEffect(() => {
    if (data && data.history.length > 0) {
      drawChart();
    }
  }, [data, timeRange]);

  function getFilteredData(): BodyweightDataPoint[] {
    if (!data || timeRange === 'all') return data?.history || [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      case '3m':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
        break;
      case '6m':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 365 days
        break;
    }

    return data.history.filter(point => new Date(point.date) >= cutoffDate);
  }

  function getFilteredStats() {
    const filtered = getFilteredData();
    if (filtered.length === 0) return data?.stats || null;

    const weights = filtered.map(h => h.weight_lbs);
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    return {
      total_measurements: filtered.length,
      avg_weight_lbs: Math.round(avgWeight * 10) / 10,
      min_weight_lbs: minWeight,
      max_weight_lbs: maxWeight,
      weight_change_lbs: Math.round((maxWeight - minWeight) * 10) / 10,
    };
  }

  async function fetchBodyweightHistory() {
    try {
      const response = await fetch(`/api/athletes/${athleteId}/bodyweight-history`);
      if (!response.ok) throw new Error('Failed to fetch bodyweight history');

      const historyData = await response.json();
      setData(historyData);
    } catch (error) {
      console.error('Error fetching bodyweight history:', error);
    } finally {
      setLoading(false);
    }
  }

  function drawChart() {
    if (!canvasRef.current || !data || data.history.length === 0) return;

    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 50, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get data points from filtered data
    const weights = filteredData.map(d => d.weight_lbs);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const weightRange = maxWeight - minWeight;
    const paddedMin = minWeight - weightRange * 0.1;
    const paddedMax = maxWeight + weightRange * 0.1;
    const paddedRange = paddedMax - paddedMin;

    // Helper functions
    const getX = (index: number) => {
      return padding.left + (index / (filteredData.length - 1)) * chartWidth;
    };

    const getY = (weight: number) => {
      const normalizedValue = (weight - paddedMin) / paddedRange;
      return padding.top + chartHeight - normalizedValue * chartHeight;
    };

    // Draw grid lines
    const gridLines = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Draw value labels
      const value = paddedMax - (paddedRange / gridLines) * i;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(1), padding.left - 10, y);
    }

    // Draw Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Weight (lbs)', 0, 0);
    ctx.restore();

    // Draw connecting line
    ctx.strokeStyle = 'rgba(155, 221, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    filteredData.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.weight_lbs);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    filteredData.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.weight_lbs);

      // Point glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#9BDDFF';

      // Point
      ctx.fillStyle = '#9BDDFF';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Point border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw X-axis labels (dates)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Show up to 6 date labels
    const labelInterval = Math.ceil(filteredData.length / 6);
    filteredData.forEach((point, index) => {
      if (index % labelInterval === 0 || index === data.history.length - 1) {
        const x = getX(index);
        const date = new Date(point.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        ctx.fillText(dateStr, x, padding.top + chartHeight + 10);
      }
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-4xl w-full">
          <div className="text-center text-neutral-400">Loading bodyweight history...</div>
        </div>
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-4xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Bodyweight History</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-center text-neutral-400">
            No bodyweight data available. Bodyweight is automatically tracked from CMJ tests.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 md:p-6 max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Bodyweight History</h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 sm:mt-1">{data.athlete.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Time Range Filters */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2">
          {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                timeRange === range
                  ? 'bg-[#9BDDFF] text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
          {(() => {
            const filteredStats = getFilteredStats();
            return (
              <>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-neutral-400 mb-0.5 sm:mb-1">Current</div>
                  <div className="text-base sm:text-xl md:text-2xl font-bold text-white">
                    {data.athlete.current_weight_lbs ? `${data.athlete.current_weight_lbs} lbs` : 'N/A'}
                  </div>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-neutral-400 mb-0.5 sm:mb-1">Average</div>
                  <div className="text-base sm:text-xl md:text-2xl font-bold text-[#9BDDFF]">
                    {filteredStats?.avg_weight_lbs ? `${filteredStats.avg_weight_lbs} lbs` : 'N/A'}
                  </div>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-neutral-400 mb-0.5 sm:mb-1">Min</div>
                  <div className="text-base sm:text-xl md:text-2xl font-bold text-green-400">
                    {filteredStats?.min_weight_lbs ? `${filteredStats.min_weight_lbs} lbs` : 'N/A'}
                  </div>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-neutral-400 mb-0.5 sm:mb-1">Max</div>
                  <div className="text-base sm:text-xl md:text-2xl font-bold text-red-400">
                    {filteredStats?.max_weight_lbs ? `${filteredStats.max_weight_lbs} lbs` : 'N/A'}
                  </div>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-neutral-400 mb-0.5 sm:mb-1">Change</div>
                  <div className="text-base sm:text-xl md:text-2xl font-bold text-amber-400">
                    {filteredStats?.weight_change_lbs !== null
                      ? `${filteredStats.weight_change_lbs > 0 ? '+' : ''}${filteredStats.weight_change_lbs} lbs`
                      : 'N/A'}
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Chart */}
        <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-3 sm:p-4 md:p-6 mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 md:mb-4">Weight Over Time</h3>
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ width: '100%', height: '300px' }}
          />
        </div>

        {/* Data Table */}
        <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 md:mb-4">Measurements ({getFilteredStats()?.total_measurements || 0})</h3>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-xs sm:text-sm min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left text-neutral-400 font-medium py-2 px-2 sm:px-4">Date</th>
                  <th className="text-right text-neutral-400 font-medium py-2 px-2 sm:px-4">Weight (lbs)</th>
                  <th className="text-right text-neutral-400 font-medium py-2 px-2 sm:px-4 hidden sm:table-cell">Weight (kg)</th>
                  <th className="text-right text-neutral-400 font-medium py-2 px-2 sm:px-4">Change</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredData().map((point, index) => {
                  const filteredData = getFilteredData();
                  const prevWeight = index > 0 ? filteredData[index - 1].weight_lbs : null;
                  const change = prevWeight ? point.weight_lbs - prevWeight : null;

                  return (
                    <tr key={point.test_id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-white text-xs sm:text-sm">
                        {new Date(point.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: window.innerWidth < 640 ? '2-digit' : 'numeric'
                        })}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-white font-medium">
                        {point.weight_lbs} lbs
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-neutral-400 hidden sm:table-cell">
                        {point.weight_kg} kg
                      </td>
                      <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-medium ${
                        change === null ? 'text-neutral-500' :
                        change > 0 ? 'text-red-400' :
                        change < 0 ? 'text-green-400' :
                        'text-neutral-400'
                      }`}>
                        {change === null ? '—' :
                         change > 0 ? `+${change.toFixed(1)}` :
                         change.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
