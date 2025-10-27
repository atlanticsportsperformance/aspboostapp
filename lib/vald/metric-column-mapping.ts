/**
 * Maps athlete_percentile_history metric names to percentile_lookup metric_column names
 */

export function getMetricColumnName(testType: string, metricName: string): string | null {
  // Format: test_type:metric_name -> metric_column
  const mappings: Record<string, string> = {
    // CMJ
    'CMJ:Peak Power (W)': 'peak_takeoff_power_trial_value',
    'CMJ:Peak Power / BM (W/kg)': 'bodymass_relative_takeoff_power_trial_value',

    // SJ
    'SJ:Peak Power (W)': 'sj_peak_takeoff_power_trial_value',
    'SJ:Peak Power / BM (W/kg)': 'sj_bodymass_relative_takeoff_power_trial_value',

    // HJ
    'HJ:Reactive Strength Index': 'hop_mean_rsi_trial_value',

    // PPU
    'PPU:Peak Takeoff Force (N)': 'ppu_peak_takeoff_force_trial_value',

    // IMTP
    'IMTP:Net Peak Force (N)': 'net_peak_vertical_force_trial_value',
    'IMTP:Relative Strength': 'relative_strength_trial_value',
  };

  const key = `${testType}:${metricName}`;
  return mappings[key] || null;
}
