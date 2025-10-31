/**
 * TypeScript types for Blast Motion + HitTrax paired data analysis
 *
 * These types define the structure for matching and analyzing combined
 * data from Blast Motion (swing mechanics) and HitTrax (ball flight outcomes).
 */

// =============================================================================
// Blast Motion Types
// =============================================================================

export interface BlastSwing {
  id: string;
  athlete_id: string;
  recorded_date: string; // "2024-10-30"
  recorded_time: string; // "14:23:15" (NOTE: This is in UTC, not local time!)
  created_at_utc: string; // "2025-10-30T23:06:48+00:00" (UTC timestamp)
  swing_details: string | null; // Type of swing
  bat_speed: number | null;
  attack_angle: number | null;
  vertical_bat_angle: number | null;
  early_connection: number | null;
  connection_at_impact: number | null;
  peak_hand_speed: number | null;
  rotational_acceleration: number | null;
  plane_score: number | null;
  connection_score: number | null;
  rotation_score: number | null;
  time_to_contact: number | null;
  on_plane_efficiency: number | null;
  power: number | null;
}

export interface BlastSession {
  date: string; // "2024-10-30"
  startTime: Date;
  endTime: Date;
  swings: BlastSwing[];
  swingCount: number;

  // Aggregated stats
  avgBatSpeed: number | null;
  maxBatSpeed: number | null;
  avgAttackAngle: number | null;
  avgPeakHandSpeed: number | null;
}

// =============================================================================
// HitTrax Types
// =============================================================================

export interface HitTraxSwing {
  id: string;
  session_id: string;
  swing_number: number;
  swing_timestamp: string | null; // "10/30/2025 19:18:31.573"

  // Ball flight metrics
  exit_velocity: number | null;
  launch_angle: number | null;
  distance: number | null;
  horizontal_angle: number | null;

  // Hit outcome
  result: string | null; // "HR", "1B", "F8", etc.
  hit_type: string | null; // "FB", "LD", "GB"
  points: number | null;

  // Point of impact
  poi_x: number | null;
  poi_y: number | null;
  poi_z: number | null;

  // Pitch info
  pitch_velocity: number | null;
  strike_zone: number | null;
}

export interface HitTraxSessionData {
  session_id: string;
  athlete_id: string;
  athlete_name: string;
  session_date: Date;
  swings: HitTraxSwing[];
  swingCount: number;

  // Aggregated stats
  avgExitVelocity: number | null;
  maxExitVelocity: number | null;
  avgLaunchAngle: number | null;
  avgDistance: number | null;
  maxDistance: number | null;
  hardHitCount: number; // >= 90 mph
  hardHitRate: number | null; // percentage
}

// =============================================================================
// Session Linking Types
// =============================================================================

export interface SessionLink {
  id: string;
  athlete_id: string;

  // Blast session info
  blast_session_date: string;
  blast_session_start_time: Date;
  blast_session_end_time: Date;
  blast_swing_count: number;

  // HitTrax session reference
  hittrax_session_id: string;

  // Matching metadata
  match_method: 'time_window' | 'manual' | 'date_overlap';
  match_confidence: number | null; // 0.00 to 1.00
  time_window_minutes: number | null;
  manually_verified: boolean;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Paired Session Types
// =============================================================================

export interface PairedSession {
  // Identification
  linkId: string | null; // null if not yet linked in database
  athleteId: string;
  date: string; // "2024-10-30"

  // Data from both systems
  blastSession: BlastSession | null;
  hittraxSession: HitTraxSessionData | null;

  // Matching info
  matchConfidence: number; // 0-1
  matchMethod: 'time_window' | 'manual' | 'date_overlap' | 'unmatched';
  timeGapMinutes: number | null; // Time between session centers

  // Combined analysis metrics
  analysis: PairedSessionAnalysis;

  // Individual swing pairs for detailed view
  swingPairs?: SwingPair[]; // Optional, only included when requested
}

export interface PairedSessionAnalysis {
  // Efficiency metrics (how bat speed converts to exit velocity)
  batSpeedToExitVeloRatio: number | null; // EV / Bat Speed (typically 1.2-1.5)
  avgBatSpeed: number | null;
  avgExitVelocity: number | null;

  // Angle comparison
  angleCorrelation: number | null; // -1 to 1, how attack angle relates to launch angle
  avgAttackAngle: number | null;
  avgLaunchAngle: number | null;
  angleDifference: number | null; // avg launch - avg attack

  // Quality metrics
  hardHitRate: number | null; // % of HitTrax swings with EV >= 90 mph
  avgBatSpeedOnHardHits: number | null; // Blast bat speed on hard hit swings

  // Consistency
  batSpeedCV: number | null; // Coefficient of variation (lower = more consistent)
  exitVelocityCV: number | null;

  // Count matching
  blastSwingCount: number;
  hittraxSwingCount: number;
  swingCountMatch: boolean; // true if counts are similar (within 20%)
}

// =============================================================================
// Time Window Matching Configuration
// =============================================================================

export interface MatchingConfig {
  windowMinutes: number; // Default: 60 (match if sessions within ±60 min)
  minConfidenceThreshold: number; // Default: 0.5 (50%)
  maxTimeGapMinutes: number; // Default: 120 (2 hours)
  requireSwingCountSimilarity: boolean; // Default: false
  swingCountTolerancePercent: number; // Default: 50 (counts within 50% = match)
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  windowMinutes: 60,
  minConfidenceThreshold: 0.5,
  maxTimeGapMinutes: 120,
  requireSwingCountSimilarity: false,
  swingCountTolerancePercent: 50,
};

// =============================================================================
// API Response Types
// =============================================================================

export interface PairedSessionsResponse {
  success: boolean;
  data: PairedSession[];
  stats: {
    totalSessions: number;
    pairedSessions: number;
    blastOnlySessions: number;
    hittraxOnlySessions: number;
    avgMatchConfidence: number;
  };
  config: MatchingConfig;
}

export interface PairedSessionDetailResponse {
  success: boolean;
  data: PairedSession;
  swingPairs: SwingPair[]; // Individual swing-by-swing pairing
}

export interface SwingPair {
  blastSwing: BlastSwing | null;
  hittraxSwing: HitTraxSwing | null;
  timeDifferenceSeconds: number | null;
  confidence: number; // 0-1
}
