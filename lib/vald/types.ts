// VALD ForceDecks Integration Types

export type PlayLevel = 'Youth' | 'High School' | 'College' | 'Pro';

export type TestType = 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP';

export interface VALDProfileData {
  vald_profile_id: string | null;
  vald_sync_id: string | null;
  vald_external_id: string | null;
  vald_synced_at: string | null;
  vald_composite_score: number | null;
  vald_composite_history: CompositeScoreHistory[];
}

export interface CompositeScoreHistory {
  score: number;
  date: string;
  test_types: TestType[];
}

export interface AthleteWithVALD {
  id: string;
  user_id: string;
  org_id: string;
  position: string | null;
  grad_year: number | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  play_level: PlayLevel | null;
  vald_profile_id: string | null;
  vald_sync_id: string | null;
  vald_external_id: string | null;
  vald_synced_at: string | null;
  vald_composite_score: number | null;
  vald_composite_history: CompositeScoreHistory[];
}

export interface TestSummary {
  test_type: TestType;
  latest_test_date: string | null;
  test_count: number;
  key_metrics: {
    [key: string]: {
      value: number;
      unit: string;
      date: string;
    };
  };
}

export interface ForceProfileData {
  athlete: AthleteWithVALD;
  test_summaries: TestSummary[];
  composite_score: number | null;
  last_sync: string | null;
}

// CMJ Test Metrics (key metrics only for UI)
export interface CMJMetrics {
  jump_height_trial_value: number | null;
  jump_height_trial_unit: string | null;
  peak_takeoff_force_trial_value: number | null;
  peak_takeoff_force_trial_unit: string | null;
  peak_takeoff_power_trial_value: number | null;
  peak_takeoff_power_trial_unit: string | null;
  concentric_rfd_trial_value: number | null;
  concentric_rfd_trial_unit: string | null;
  rsi_modified_trial_value: number | null;
  rsi_modified_trial_unit: string | null;
}

// SJ Test Metrics
export interface SJMetrics {
  jump_height_trial_value: number | null;
  jump_height_trial_unit: string | null;
  peak_takeoff_force_trial_value: number | null;
  peak_takeoff_force_trial_unit: string | null;
  peak_takeoff_power_trial_value: number | null;
  peak_takeoff_power_trial_unit: string | null;
}

// HJ Test Metrics
export interface HJMetrics {
  hop_best_rsi_trial_value: number | null;
  hop_best_rsi_trial_unit: string | null;
  hop_mean_rsi_trial_value: number | null;
  hop_mean_rsi_trial_unit: string | null;
  hop_best_jump_height_trial_value: number | null;
  hop_best_jump_height_trial_unit: string | null;
}

// PPU Test Metrics
export interface PPUMetrics {
  pushup_height_trial_value: number | null;
  pushup_height_trial_unit: string | null;
  peak_takeoff_force_trial_value: number | null;
  peak_takeoff_force_trial_unit: string | null;
  peak_takeoff_power_trial_value: number | null;
  peak_takeoff_power_trial_unit: string | null;
}

// IMTP Test Metrics
export interface IMTPMetrics {
  peak_vertical_force_trial_value: number | null;
  peak_vertical_force_trial_unit: string | null;
  net_peak_vertical_force_trial_value: number | null;
  net_peak_vertical_force_trial_unit: string | null;
  relative_strength_trial_value: number | null;
  relative_strength_trial_unit: string | null;
  force_at_100ms_trial_value: number | null;
  force_at_100ms_trial_unit: string | null;
  rfd_at_100ms_trial_value: number | null;
  rfd_at_100ms_trial_unit: string | null;
}

// Combined test result type
export type TestMetrics = CMJMetrics | SJMetrics | HJMetrics | PPUMetrics | IMTPMetrics;

// Full test record (for display)
export interface TestRecord {
  id: string;
  athlete_id: string;
  test_id: string;
  recorded_utc: string;
  recorded_timezone: string;
  created_at: string;
  metrics: TestMetrics;
}

// Sync status
export interface SyncStatus {
  is_syncing: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  tests_synced: number;
}

// API Response types
export interface SyncResponse {
  success: boolean;
  message: string;
  tests_synced: number;
  sync_timestamp: string;
  errors?: string[];
}

export interface ProfileLinkResponse {
  success: boolean;
  vald_profile_id: string;
  vald_sync_id: string;
  message: string;
}
