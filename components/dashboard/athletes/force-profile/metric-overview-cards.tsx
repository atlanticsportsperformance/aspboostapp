'use client';

/**
 * Overview cards showing the 6 key force profile metrics with percentiles
 */

interface MetricCard {
  label: string;
  value: number | null;
  unit: string;
  percentile: number | null;
  testType: string;
}

interface MetricOverviewCardsProps {
  imtpNetPeakForce: number | null;
  imtpNetPeakForcePercentile: number | null;
  imtpRelativeStrength: number | null;
  imtpRelativeStrengthPercentile: number | null;
  sjPeakPowerBW: number | null;
  sjPeakPowerBWPercentile: number | null;
  ppuPeakForce: number | null;
  ppuPeakForcePercentile: number | null;
  sjPeakPower: number | null;
  sjPeakPowerPercentile: number | null;
  hjRSI: number | null;
  hjRSIPercentile: number | null;
}

function MetricCard({ label, value, unit, percentile, testType }: MetricCard) {
  const getPercentileColor = (p: number | null) => {
    if (p === null) return 'text-gray-400';
    if (p >= 75) return 'text-green-400';
    if (p >= 50) return 'text-[#9BDDFF]';
    if (p >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-[#9BDDFF]/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{testType}</p>
        {percentile !== null && (
          <span className={`text-sm font-semibold ${getPercentileColor(percentile)}`}>
            {Math.round(percentile)}th
          </span>
        )}
      </div>

      <h4 className="text-sm font-medium text-white mb-1">{label}</h4>

      {value !== null ? (
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold text-white">
            {value.toFixed(value >= 100 ? 0 : 2)}
          </span>
          <span className="text-sm text-gray-400 mb-1">{unit}</span>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No data</p>
      )}
    </div>
  );
}

export default function MetricOverviewCards(props: MetricOverviewCardsProps) {
  const metrics: MetricCard[] = [
    {
      label: 'Net Peak Force',
      value: props.imtpNetPeakForce,
      unit: 'N',
      percentile: props.imtpNetPeakForcePercentile,
      testType: 'IMTP',
    },
    {
      label: 'Relative Strength',
      value: props.imtpRelativeStrength,
      unit: '',
      percentile: props.imtpRelativeStrengthPercentile,
      testType: 'IMTP',
    },
    {
      label: 'Peak Power / BW',
      value: props.sjPeakPowerBW,
      unit: 'W/kg',
      percentile: props.sjPeakPowerBWPercentile,
      testType: 'SJ',
    },
    {
      label: 'Peak Force',
      value: props.ppuPeakForce,
      unit: 'N',
      percentile: props.ppuPeakForcePercentile,
      testType: 'PPU',
    },
    {
      label: 'Peak Power',
      value: props.sjPeakPower,
      unit: 'W',
      percentile: props.sjPeakPowerPercentile,
      testType: 'SJ',
    },
    {
      label: 'RSI',
      value: props.hjRSI,
      unit: '',
      percentile: props.hjRSIPercentile,
      testType: 'HJ',
    },
  ];

  const hasAnyData = metrics.some(m => m.value !== null);

  if (!hasAnyData) {
    return (
      <div className="bg-white/5 rounded-lg p-8 border border-white/10 border-dashed text-center">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-gray-400 text-sm">No test data available yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Key Force Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>
    </div>
  );
}
