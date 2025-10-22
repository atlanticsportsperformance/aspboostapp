'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PerformanceTabProps {
  athleteId: string;
}

export default function AthletePerformanceTab({ athleteId }: PerformanceTabProps) {
  const [baselines, setBaselines] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [athleteId]);

  async function fetchPerformanceData() {
    const supabase = createClient();

    // Fetch baselines
    const { data: baselinesData, error: baselinesError } = await supabase
      .from('athlete_baselines')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('measurement_date', { ascending: false });

    console.log('Baselines:', baselinesData, baselinesError);
    setBaselines(baselinesData || []);

    // Fetch KPIs
    const { data: kpisData, error: kpisError } = await supabase
      .from('athlete_kpis')
      .select(`
        *,
        kpi_definitions(id, name, description, unit, datatype),
        athlete_kpi_values(value, measured_at, recorded_by)
      `)
      .eq('athlete_id', athleteId)
      .eq('is_active', true);

    console.log('KPIs:', kpisData, kpisError);
    setKpis(kpisData || []);

    setLoading(false);
  }

  const getProgressPercentage = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getTrendIcon = (values: any[]) => {
    if (!values || values.length < 2) return null;
    const sorted = [...values].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
    const latest = parseFloat(sorted[sorted.length - 1]?.value || 0);
    const previous = parseFloat(sorted[sorted.length - 2]?.value || 0);

    if (latest > previous) return '↗';
    if (latest < previous) return '↘';
    return '→';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION A: MANUAL BASELINES */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Baseline Measurements</h2>
          <button
            onClick={() => alert('Add baseline - Coming soon')}
            className="px-4 py-2 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-all"
          >
            + Add Baseline
          </button>
        </div>

        {baselines.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">No Baseline Measurements</p>
            <p className="text-gray-500 text-sm">Add baseline assessments like 1RM Squat, Exit Velocity, Sprint Times</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Metric</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Value</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Unit</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {baselines.map((baseline) => (
                  <tr key={baseline.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{baseline.metric_name}</td>
                    <td className="px-6 py-4 text-white text-lg font-bold">{baseline.value}</td>
                    <td className="px-6 py-4 text-gray-400">{baseline.unit}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(baseline.measurement_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => alert('Edit - Coming soon')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-2"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION B: KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Key Performance Indicators</h2>
          <button
            onClick={() => alert('Add KPI - Coming soon')}
            className="px-4 py-2 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-all"
          >
            + Add KPI
          </button>
        </div>

        {kpis.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">No KPIs Tracked Yet</p>
            <p className="text-gray-500 text-sm">Start tracking key performance indicators</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi) => {
              const definition = kpi.kpi_definitions;
              const values = kpi.athlete_kpi_values || [];
              const latestValue = values.length > 0
                ? parseFloat(values.sort((a: any, b: any) => b.measured_at.localeCompare(a.measured_at))[0].value)
                : 0;
              const progress = getProgressPercentage(latestValue, kpi.target_value);
              const trend = getTrendIcon(values);

              return (
                <div key={kpi.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{definition?.name || 'KPI'}</h3>
                      {definition?.description && (
                        <p className="text-sm text-gray-400">{definition.description}</p>
                      )}
                    </div>
                    {trend && (
                      <span className={`text-2xl ${
                        trend === '↗' ? 'text-emerald-400' :
                        trend === '↘' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {trend}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{latestValue}</span>
                      <span className="text-gray-400">/ {kpi.target_value}</span>
                      <span className="text-sm text-gray-500">{definition?.unit}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#C9A857] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {values.length > 0 && (
                        <>Last: {new Date(values[0].measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </span>
                    <button
                      onClick={() => alert('Update value - Coming soon')}
                      className="text-[#C9A857] hover:text-[#B89647] font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION C: API INTEGRATION PLACEHOLDERS */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Performance Technology Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ForceDecks */}
          <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 opacity-60">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-semibold text-white mb-2 text-lg">Force Plate Data</h3>
            <p className="text-sm text-gray-400 mb-4">
              Connect ForceDecks to track jump metrics, asymmetry, power output, and ground reaction forces
            </p>
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-gray-400 cursor-not-allowed mb-2"
            >
              Connect ForceDecks
            </button>
            <span className="inline-block text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-medium">
              Coming Soon
            </span>
          </div>

          {/* Rapsodo */}
          <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 opacity-60">
            <div className="text-4xl mb-3">⚾</div>
            <h3 className="font-semibold text-white mb-2 text-lg">Pitching Analytics</h3>
            <p className="text-sm text-gray-400 mb-4">
              Connect Rapsodo to analyze velocity, spin rate, movement profiles, and pitch metrics
            </p>
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-gray-400 cursor-not-allowed mb-2"
            >
              Connect Rapsodo
            </button>
            <span className="inline-block text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-medium">
              Coming Soon
            </span>
          </div>

          {/* HitTrax / Blast */}
          <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 opacity-60">
            <div className="text-4xl mb-3">🏏</div>
            <h3 className="font-semibold text-white mb-2 text-lg">Hitting Metrics</h3>
            <p className="text-sm text-gray-400 mb-4">
              Connect HitTrax or Blast Motion to track exit velocity, launch angle, bat speed, and swing metrics
            </p>
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-gray-400 cursor-not-allowed mb-2"
            >
              Connect HitTrax / Blast
            </button>
            <span className="inline-block text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-medium">
              Coming Soon
            </span>
          </div>

          {/* WHOOP */}
          <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 opacity-60">
            <div className="text-4xl mb-3">💤</div>
            <h3 className="font-semibold text-white mb-2 text-lg">Recovery & Readiness</h3>
            <p className="text-sm text-gray-400 mb-4">
              Connect WHOOP to monitor sleep quality, HRV, strain, recovery scores, and readiness levels
            </p>
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-gray-400 cursor-not-allowed mb-2"
            >
              Connect WHOOP
            </button>
            <span className="inline-block text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-medium">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
