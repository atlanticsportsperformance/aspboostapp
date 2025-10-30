// Blast Motion Integration Types
// Follows the same pattern as VALD types (lib/vald/types.ts)

export type SportType = 'Baseball' | 'Softball';

// Blast Motion athlete profile data (stored on athletes table)
export interface BlastProfileData {
  blast_user_id: string | null;
  blast_player_id: number | null;
  blast_external_id: string | null;
  blast_synced_at: string | null;
  blast_sync_error: string | null;
}

// Athlete with Blast Motion data
export interface AthleteWithBlast {
  id: string;
  user_id: string | null;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  grad_year: number | null;
  date_of_birth: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  dominant_hand: string | null;
  blast_user_id: string | null;
  blast_player_id: number | null;
  blast_external_id: string | null;
  blast_synced_at: string | null;
  blast_sync_error: string | null;
}

// Individual swing metric
export interface SwingMetric {
  display_name: string;
  value: string;
  display_value: string;
  unit: string;
  display_unit: string;
}

// Key swing metrics (for UI display)
export interface KeySwingMetrics {
  // Speed metrics
  bat_speed?: SwingMetric;
  swing_speed?: SwingMetric;
  peak_hand_speed?: SwingMetric;

  // Path metrics
  bat_path_angle?: SwingMetric;  // Attack Angle
  vertical_bat_angle?: SwingMetric;
  on_plane_efficiency?: SwingMetric;

  // Timing metrics
  time_to_contact?: SwingMetric;
  time_to_impact?: SwingMetric;

  // Quality scores
  plane_score?: SwingMetric;
  connection_score?: SwingMetric;
  rotation_score?: SwingMetric;

  // Power metrics
  power?: SwingMetric;
  peak_bat_speed?: SwingMetric;

  // Additional metrics (stored in JSONB)
  [key: string]: SwingMetric | undefined;
}

// Swing record (from blast_swings table)
export interface SwingRecord {
  id: string;
  athlete_id: string;
  blast_id: string;
  swing_id: number | null;
  academy_id: string | null;
  recorded_date: string;
  recorded_time: string;
  created_at_utc: string;
  sport_id: number | null;
  handedness: number | null;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_nickname: string | null;
  has_video: boolean;
  video_id: number | null;
  video_url: string | null;
  metrics: KeySwingMetrics;
  synced_at: string;
}

// Swing averages (from blast_averages_history table)
export interface SwingAverages {
  id: string;
  athlete_id: string;
  period_start: string;
  period_end: string;
  total_actions: number;
  total_actions_extended: number | null;
  averages: KeySwingMetrics;
  captured_at: string;
}

// Sync job status (from blast_sync_jobs table)
export interface BlastSyncJob {
  id: string;
  org_id: string | null;
  athlete_id: string | null;
  sync_type: 'team' | 'individual' | 'full';
  date_range_start: string;
  date_range_end: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  swings_found: number;
  swings_synced: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Sync status (for UI)
export interface SyncStatus {
  is_syncing: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  swings_synced: number;
}

// API Response types
export interface SyncResponse {
  success: boolean;
  message: string;
  swings_synced: number;
  sync_timestamp: string;
  errors?: string[];
}

export interface LinkResponse {
  success: boolean;
  blast_user_id: string;
  blast_player_id: number;
  message: string;
}

// Hitting profile data (for dashboard display)
export interface HittingProfileData {
  athlete: AthleteWithBlast;
  swing_count: number;
  latest_swing_date: string | null;
  last_sync: string | null;
  key_averages: {
    bat_speed: number | null;
    attack_angle: number | null;
    time_to_contact: number | null;
    plane_score: number | null;
  };
  recent_swings: SwingRecord[];
}

// Swing library filter params
export interface SwingLibraryFilters {
  dateStart?: string;
  dateEnd?: string;
  hasVideo?: boolean;
  equipmentId?: string;
  handedness?: number;
  sortBy?: 'recorded_date' | 'bat_speed' | 'attack_angle';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// Equipment summary
export interface EquipmentSummary {
  equipment_id: string;
  equipment_name: string;
  equipment_nickname: string | null;
  swing_count: number;
  avg_bat_speed: number | null;
  avg_attack_angle: number | null;
  last_used: string;
}

// Time-series data point (for charts)
export interface MetricDataPoint {
  date: string;
  value: number;
  swing_count: number;
}

// Metrics comparison (current vs previous period)
export interface MetricsComparison {
  metric_name: string;
  current_value: number;
  previous_value: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

// Blast Motion handedness mapping
export const BLAST_HANDEDNESS = {
  RIGHT: 0,
  LEFT: 1,
  BOTH: 2,
} as const;

// Swing handedness mapping (per-swing)
export const SWING_HANDEDNESS = {
  LEFT: 4,
  RIGHT: 5,
} as const;

// Sport ID mapping
export const SPORT_ID = {
  BASEBALL: 2,
  SOFTBALL: 12,
} as const;

// Helper function to get sport name
export function getSportName(sportId: number | null): SportType | 'Unknown' {
  if (sportId === SPORT_ID.BASEBALL) return 'Baseball';
  if (sportId === SPORT_ID.SOFTBALL) return 'Softball';
  return 'Unknown';
}

// Helper function to get handedness name
export function getHandednessName(handedness: number | null): string {
  if (handedness === BLAST_HANDEDNESS.LEFT || handedness === SWING_HANDEDNESS.LEFT) return 'Left';
  if (handedness === BLAST_HANDEDNESS.RIGHT || handedness === SWING_HANDEDNESS.RIGHT) return 'Right';
  if (handedness === BLAST_HANDEDNESS.BOTH) return 'Both';
  return 'Unknown';
}

// Helper function to parse metric value as number
export function parseMetricValue(metric: SwingMetric | undefined): number | null {
  if (!metric || !metric.value) return null;
  const parsed = parseFloat(metric.value);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to format metric display
export function formatMetricDisplay(metric: SwingMetric | undefined): string {
  if (!metric) return '--';
  return metric.display_value || metric.value || '--';
}
