'use client';

interface MetricCardProps {
  displayName: string;
  current: {
    percentile: number;
    value: number;
    date: string;
  } | null;
  previous: {
    percentile: number;
    value: number;
    date: string;
  } | null;
  onClick?: () => void;
}

export default function ForceOverviewMetricCard({ displayName, current, previous, onClick }: MetricCardProps) {
  if (!current) {
    return (
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-md">
        <h3 className="text-white font-medium mb-2">{displayName}</h3>
        <p className="text-gray-400 text-sm">No data</p>
      </div>
    );
  }

  // Get brief description for metric
  const getMetricDescription = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('sj') && lower.includes('power')) return 'Explosive strength';
    if (lower.includes('hj') && lower.includes('rsi')) return 'Reactive power';
    if (lower.includes('ppu') && lower.includes('force')) return 'Upper body pull';
    if (lower.includes('imtp') && lower.includes('force')) return 'Max strength';
    if (lower.includes('cmj') && lower.includes('power')) return 'Dynamic power';
    if (lower.includes('relative')) return 'Power per kg';
    return 'Force metric';
  };

  // Get gradient color based on percentile zone
  const getGradientClass = (percentile: number): string => {
    if (percentile >= 75) return 'from-green-500 to-emerald-600'; // ELITE
    if (percentile >= 50) return 'from-[#9BDDFF] to-blue-500'; // OPTIMIZE
    if (percentile >= 25) return 'from-yellow-400 to-amber-500'; // SHARPEN
    return 'from-red-500 to-rose-600'; // BUILD
  };

  const getZoneLabel = (percentile: number): string => {
    if (percentile >= 75) return 'ELITE';
    if (percentile >= 50) return 'OPTIMIZE';
    if (percentile >= 25) return 'SHARPEN';
    return 'BUILD';
  };

  const currentGradient = getGradientClass(current.percentile);
  const currentZone = getZoneLabel(current.percentile);
  const change = previous ? current.percentile - previous.percentile : 0;
  const changeIcon = change > 0 ? '↗' : change < 0 ? '↘' : '→';
  const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

  // Apple-style gradient: black from top-left fading to zone color
  const bgGradient = currentZone === 'ELITE'
    ? 'from-black via-green-900/40 to-green-500/30'
    : currentZone === 'OPTIMIZE'
    ? 'from-black via-blue-900/40 to-[#9BDDFF]/30'
    : currentZone === 'SHARPEN'
    ? 'from-black via-yellow-900/40 to-yellow-400/30'
    : 'from-black via-red-900/40 to-red-500/30';

  const borderColor = currentZone === 'ELITE' ? 'border-green-500/40' :
                      currentZone === 'OPTIMIZE' ? 'border-[#9BDDFF]/40' :
                      currentZone === 'SHARPEN' ? 'border-yellow-400/40' :
                      'border-red-500/40';

  // Glow effect for hover
  const glowColor = currentZone === 'ELITE' ? 'hover:shadow-green-500/50' :
                    currentZone === 'OPTIMIZE' ? 'hover:shadow-[#9BDDFF]/50' :
                    currentZone === 'SHARPEN' ? 'hover:shadow-yellow-400/50' :
                    'hover:shadow-red-500/50';

  const textColor = currentZone === 'ELITE' ? 'text-green-400' :
                    currentZone === 'OPTIMIZE' ? 'text-[#9BDDFF]' :
                    currentZone === 'SHARPEN' ? 'text-yellow-400' :
                    'text-red-400';

  return (
    <div
      onClick={onClick}
      className={`group bg-gradient-to-br ${bgGradient} rounded-2xl p-2.5 md:p-3 border ${borderColor}
                  backdrop-blur-xl transition-all duration-300 ease-out ${onClick ? 'cursor-pointer' : ''}
                  ${onClick ? 'hover:scale-[1.02] hover:-translate-y-1' : ''} hover:shadow-2xl ${glowColor}
                  shadow-lg shadow-black/20`}
    >
      {/* Header with HUGE percentile number */}
      <div className="flex items-start justify-between mb-1.5 md:mb-2">
        <div className="max-w-[120px]">
          <h3 className="text-white/90 font-semibold text-xs md:text-sm leading-tight">{displayName}</h3>
          <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{getMetricDescription(displayName)}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-0.5">
            <span className={`text-3xl md:text-4xl font-bold ${textColor} transition-all duration-300 group-hover:scale-110`}>
              {Math.round(current.percentile)}
            </span>
            <span className="text-xs text-white/50 mb-1">%</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            currentZone === 'ELITE' ? 'bg-green-500/30 text-green-300' :
            currentZone === 'OPTIMIZE' ? 'bg-blue-500/30 text-blue-300' :
            currentZone === 'SHARPEN' ? 'bg-yellow-500/30 text-yellow-300' :
            'bg-red-500/30 text-red-300'
          }`}>
            {currentZone}
          </span>
        </div>
      </div>

      {/* Current Test Bar with rounded caps and glow */}
      <div className="mb-1.5 md:mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-white/60 font-medium">
            {new Date(current.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          </span>
        </div>
        <div className="h-2.5 md:h-3 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className={`h-full bg-gradient-to-r ${currentGradient} transition-all duration-700 ease-out relative rounded-full
                        shadow-lg ${currentZone === 'ELITE' ? 'shadow-green-500/50' :
                                    currentZone === 'OPTIMIZE' ? 'shadow-[#9BDDFF]/50' :
                                    currentZone === 'SHARPEN' ? 'shadow-yellow-400/50' :
                                    'shadow-red-500/50'}`}
            style={{ width: `${current.percentile}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Previous Test Bar (if exists) */}
      {previous && (
        <div className="mb-1.5 md:mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40">
              {new Date(previous.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
            <span className={`text-xs md:text-sm font-bold ${changeColor} flex items-center gap-1`}>
              <span className="text-sm md:text-base">{changeIcon}</span> {Math.abs(change).toFixed(0)}
            </span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-gray-500/60 to-gray-600/60 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${previous.percentile}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Value Display */}
      <div className="mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-white/10">
        <div className="text-[10px] text-white/50 font-medium">Raw Value</div>
        <div className="text-xs md:text-sm text-white/90 font-mono font-semibold mt-0.5">{current.value.toFixed(1)}</div>
      </div>
    </div>
  );
}
