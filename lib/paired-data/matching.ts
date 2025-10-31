/**
 * Swing-by-Swing Matching Algorithm for Blast Motion + HitTrax
 *
 * Matches individual Blast Motion swings with individual HitTrax swings based on
 * temporal proximity. When an athlete wears a Blast sensor during HitTrax sessions,
 * each swing should have near-identical timestamps in both systems.
 *
 * Uses a time window (default: 5 seconds) to match swings that occurred at the same time.
 */

import {
  BlastSwing,
  BlastSession,
  HitTraxSwing,
  HitTraxSessionData,
  PairedSession,
  PairedSessionAnalysis,
  SwingPair,
  MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
} from './types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse Blast Motion timestamp
 *
 * Prefers created_at_utc which is a proper ISO timestamp that JavaScript
 * can parse correctly and convert to local time for matching.
 *
 * Falls back to recorded_date/recorded_time which now stores local time
 * (after the migration script updates existing data).
 *
 * Example: created_at_utc: "2025-10-30T23:06:48+00:00" (UTC)
 *          becomes 7:06 PM EDT when converted to Eastern time
 */
function parseBlastTimestamp(swing: BlastSwing): Date | null {
  // Prefer created_at_utc (proper ISO timestamp in UTC)
  if (swing.created_at_utc) {
    return new Date(swing.created_at_utc);
  }

  // Fallback to recorded_date/recorded_time (now in local time after migration)
  if (swing.recorded_date && swing.recorded_time) {
    return new Date(`${swing.recorded_date}T${swing.recorded_time}`);
  }

  return null;
}

/**
 * Parse HitTrax timestamp as local time
 * Format: "10/30/2025 19:18:31.573"
 * Treats as local time WITHOUT timezone conversion to preserve the date
 */
function parseHitTraxTimestamp(timestamp: string | null): Date | null {
  if (!timestamp) return null;
  try {
    const [datePart, timePart] = timestamp.split(' ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, secondsWithMs] = timePart.split(':');
    const seconds = parseFloat(secondsWithMs);

    // Create Date object using local time (no timezone offset)
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      seconds
    );
  } catch {
    return null;
  }
}

/**
 * Calculate time difference in minutes between two dates
 */
function getTimeDifferenceMinutes(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
}

/**
 * Calculate coefficient of variation (CV) for consistency metrics
 */
function calculateCV(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return null;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return null;
  return numerator / denominator;
}

// =============================================================================
// Blast Session Grouping
// =============================================================================

/**
 * Group Blast swings by date into sessions
 */
export function groupBlastSwingsBySessions(swings: BlastSwing[]): BlastSession[] {
  const sessionMap = new Map<string, BlastSwing[]>();

  // Group swings by date (using local time from created_at_utc)
  swings.forEach((swing) => {
    const timestamp = parseBlastTimestamp(swing);
    if (timestamp) {
      // Get local date components
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      if (!sessionMap.has(date)) {
        sessionMap.set(date, []);
      }
      sessionMap.get(date)!.push(swing);
    }
  });

  // Convert to BlastSession objects
  const sessions: BlastSession[] = [];

  sessionMap.forEach((sessionSwings, date) => {
    // Parse timestamps to find session start/end
    const timestamps = sessionSwings
      .map((s) => parseBlastTimestamp(s))
      .filter((t): t is Date => t !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const startTime = timestamps[0];
    const endTime = timestamps[timestamps.length - 1];

    // Calculate aggregated stats
    const batSpeeds = sessionSwings.map((s) => s.bat_speed).filter((v): v is number => v !== null);
    const attackAngles = sessionSwings
      .map((s) => s.attack_angle)
      .filter((v): v is number => v !== null);
    const peakHandSpeeds = sessionSwings
      .map((s) => s.peak_hand_speed)
      .filter((v): v is number => v !== null);

    sessions.push({
      date,
      startTime,
      endTime,
      swings: sessionSwings,
      swingCount: sessionSwings.length,
      avgBatSpeed: batSpeeds.length > 0 ? batSpeeds.reduce((a, b) => a + b) / batSpeeds.length : null,
      maxBatSpeed: batSpeeds.length > 0 ? Math.max(...batSpeeds) : null,
      avgAttackAngle:
        attackAngles.length > 0 ? attackAngles.reduce((a, b) => a + b) / attackAngles.length : null,
      avgPeakHandSpeed:
        peakHandSpeeds.length > 0 ? peakHandSpeeds.reduce((a, b) => a + b) / peakHandSpeeds.length : null,
    });
  });

  return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

// =============================================================================
// Swing-by-Swing Matching (Primary Algorithm)
// =============================================================================

/**
 * Match individual Blast swings with HitTrax swings based on timestamp proximity
 *
 * This is the MAIN matching algorithm - it pairs individual swings that occurred
 * at nearly the same time (within configurable seconds, default 10s).
 *
 * Analysis (Oct 2025): Increasing from 5s to 10s improved matching by 25%
 * - At 5s: 30 paired swings (54%)
 * - At 10s: 44 paired swings (79%)
 * - Improvement: +14 swings, +25%
 *
 * Rationale: 10s window accommodates device clock sync differences and
 * practice swings between recorded swings without compromising accuracy.
 */
export function matchSwingsByTime(
  blastSwings: BlastSwing[],
  hittraxSwings: HitTraxSwing[],
  maxTimeDifferenceSeconds: number = 10
): SwingPair[] {
  const swingPairs: SwingPair[] = [];
  const matchedBlastIds = new Set<string>();
  const matchedHittraxIds = new Set<string>();

  // Parse all timestamps upfront
  const blastWithTime = blastSwings.map(swing => ({
    swing,
    timestamp: parseBlastTimestamp(swing),
  }))
  .filter((item): item is { swing: BlastSwing; timestamp: Date } => item.timestamp !== null)
  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const hittraxWithTime = hittraxSwings.map(swing => ({
    swing,
    timestamp: parseHitTraxTimestamp(swing.swing_timestamp),
  }))
  .filter((item): item is { swing: HitTraxSwing; timestamp: Date } => item.timestamp !== null)
  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // For each Blast swing, find the closest HitTrax swing in time
  blastWithTime.forEach(({ swing: blastSwing, timestamp: blastTime }) => {
    let closestMatch: {
      hittraxSwing: HitTraxSwing;
      timeDiff: number;
    } | null = null;

    hittraxWithTime.forEach(({ swing: hittraxSwing, timestamp: hittraxTime }) => {
      // Skip already matched HitTrax swings
      if (matchedHittraxIds.has(hittraxSwing.id)) return;

      // Calculate time difference in seconds
      const timeDiffSeconds = Math.abs(blastTime.getTime() - hittraxTime.getTime()) / 1000;

      // Check if within acceptable window
      if (timeDiffSeconds <= maxTimeDifferenceSeconds) {
        if (!closestMatch || timeDiffSeconds < closestMatch.timeDiff) {
          closestMatch = {
            hittraxSwing,
            timeDiff: timeDiffSeconds,
          };
        }
      }
    });

    if (closestMatch) {
      // Found a match!
      matchedBlastIds.add(blastSwing.id);
      matchedHittraxIds.add(closestMatch.hittraxSwing.id);

      // Calculate confidence: closer in time = higher confidence
      // 0 seconds = 1.0 confidence, maxTimeDifferenceSeconds = 0.0 confidence
      const confidence = 1.0 - (closestMatch.timeDiff / maxTimeDifferenceSeconds);

      swingPairs.push({
        blastSwing,
        hittraxSwing: closestMatch.hittraxSwing,
        timeDifferenceSeconds: closestMatch.timeDiff,
        confidence,
      });
    } else {
      // No match - Blast swing only
      swingPairs.push({
        blastSwing,
        hittraxSwing: null,
        timeDifferenceSeconds: null,
        confidence: 0,
      });
    }
  });

  // Add unmatched HitTrax swings
  hittraxWithTime.forEach(({ swing: hittraxSwing }) => {
    if (!matchedHittraxIds.has(hittraxSwing.id)) {
      swingPairs.push({
        blastSwing: null,
        hittraxSwing,
        timeDifferenceSeconds: null,
        confidence: 0,
      });
    }
  });

  return swingPairs;
}

/**
 * Group swing pairs by date to create paired sessions with detailed swing data
 */
export function groupSwingPairsIntoSessions(
  swingPairs: SwingPair[],
  athleteId: string
): PairedSession[] {
  const sessionMap = new Map<string, SwingPair[]>();

  // Group by date (using local time, not UTC)
  swingPairs.forEach(pair => {
    let date: string;

    if (pair.blastSwing) {
      // Convert UTC timestamp to local date
      const timestamp = parseBlastTimestamp(pair.blastSwing);
      if (timestamp) {
        // Get local date components
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      } else {
        date = 'unknown';
      }
    } else if (pair.hittraxSwing?.swing_timestamp) {
      // Extract date directly from timestamp string without Date object conversion
      // Format: "10/30/2025 19:18:31.573"
      const [datePart] = pair.hittraxSwing.swing_timestamp.split(' ');
      const [month, day, year] = datePart.split('/');
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      date = 'unknown';
    }

    if (!sessionMap.has(date)) {
      sessionMap.set(date, []);
    }
    sessionMap.get(date)!.push(pair);
  });

  // Convert to PairedSession objects
  const sessions: PairedSession[] = [];

  sessionMap.forEach((pairs, date) => {
    // Separate paired vs unpaired swings
    const pairedSwings = pairs.filter(p => p.blastSwing && p.hittraxSwing);
    const blastOnlySwings = pairs.filter(p => p.blastSwing && !p.hittraxSwing);
    const hittraxOnlySwings = pairs.filter(p => !p.blastSwing && p.hittraxSwing);

    // Build Blast session from Blast swings
    const allBlastSwings = pairs
      .map(p => p.blastSwing)
      .filter((s): s is BlastSwing => s !== null);

    const blastSession = allBlastSwings.length > 0
      ? createBlastSessionFromSwings(allBlastSwings, date)
      : null;

    // Build HitTrax session from HitTrax swings
    const allHittraxSwings = pairs
      .map(p => p.hittraxSwing)
      .filter((s): s is HitTraxSwing => s !== null);

    const hittraxSession = allHittraxSwings.length > 0
      ? createHitTraxSessionFromSwings(allHittraxSwings, athleteId, date)
      : null;

    // Calculate overall match confidence for the session
    // Based on: (paired swings) / min(blast swings, hittrax swings)
    // This gives % of swings that matched when BOTH systems were recording
    // Excludes periods when only one system was active
    const minSwingCount = Math.min(allBlastSwings.length, allHittraxSwings.length);
    const matchRate = minSwingCount > 0 ? pairedSwings.length / minSwingCount : 0;

    // Also calculate average quality of the matches that did pair
    const avgQuality = pairedSwings.length > 0
      ? pairedSwings.reduce((sum, p) => sum + p.confidence, 0) / pairedSwings.length
      : 0;

    // Final confidence combines match rate with quality
    // If 80% of swings matched with 90% quality, confidence = 0.8 * 0.9 = 0.72
    const avgConfidence = matchRate * avgQuality;

    // Determine match method
    let matchMethod: 'time_window' | 'manual' | 'date_overlap' | 'unmatched';
    if (pairedSwings.length > 0) {
      matchMethod = 'time_window';
    } else {
      matchMethod = 'unmatched';
    }

    sessions.push({
      linkId: null,
      athleteId,
      date,
      blastSession,
      hittraxSession,
      matchConfidence: avgConfidence,
      matchMethod,
      timeGapMinutes: null, // Not applicable for swing-by-swing matching
      analysis: analyzePairedSessionFromSwingPairs(pairs),
      swingPairs: pairs, // Include swing pairs for detailed view
    });
  });

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Helper: Create a BlastSession from an array of swings
 */
function createBlastSessionFromSwings(swings: BlastSwing[], date: string): BlastSession {
  const timestamps = swings
    .map(s => parseBlastTimestamp(s))
    .filter((t): t is Date => t !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const batSpeeds = swings.map(s => s.bat_speed).filter((v): v is number => v !== null);
  const attackAngles = swings.map(s => s.attack_angle).filter((v): v is number => v !== null);
  const peakHandSpeeds = swings.map(s => s.peak_hand_speed).filter((v): v is number => v !== null);

  return {
    date,
    startTime: timestamps[0],
    endTime: timestamps[timestamps.length - 1],
    swings,
    swingCount: swings.length,
    avgBatSpeed: batSpeeds.length > 0 ? batSpeeds.reduce((a, b) => a + b) / batSpeeds.length : null,
    maxBatSpeed: batSpeeds.length > 0 ? Math.max(...batSpeeds) : null,
    avgAttackAngle: attackAngles.length > 0 ? attackAngles.reduce((a, b) => a + b) / attackAngles.length : null,
    avgPeakHandSpeed: peakHandSpeeds.length > 0 ? peakHandSpeeds.reduce((a, b) => a + b) / peakHandSpeeds.length : null,
  };
}

/**
 * Helper: Create a HitTraxSessionData from an array of swings
 */
function createHitTraxSessionFromSwings(
  swings: HitTraxSwing[],
  athleteId: string,
  date: string
): HitTraxSessionData {
  const exitVelocities = swings
    .map(s => s.exit_velocity)
    .filter((v): v is number => v !== null && v > 0);

  const launchAngles = swings
    .map(s => s.launch_angle)
    .filter((a): a is number => a !== null);

  const distances = swings
    .map(s => s.distance)
    .filter((d): d is number => d !== null && d > 0);

  const hardHitCount = exitVelocities.filter(ev => ev >= 90).length;
  const hardHitRate = exitVelocities.length > 0 ? (hardHitCount / exitVelocities.length) * 100 : null;

  return {
    session_id: swings[0]?.session_id || 'unknown',
    athlete_id: athleteId,
    athlete_name: 'Unknown', // Would need to fetch from athlete table
    session_date: new Date(date),
    swings,
    swingCount: swings.length,
    avgExitVelocity: exitVelocities.length > 0 ? exitVelocities.reduce((a, b) => a + b) / exitVelocities.length : null,
    maxExitVelocity: exitVelocities.length > 0 ? Math.max(...exitVelocities) : null,
    avgLaunchAngle: launchAngles.length > 0 ? launchAngles.reduce((a, b) => a + b) / launchAngles.length : null,
    avgDistance: distances.length > 0 ? distances.reduce((a, b) => a + b) / distances.length : null,
    maxDistance: distances.length > 0 ? Math.max(...distances) : null,
    hardHitCount,
    hardHitRate,
  };
}

/**
 * Analyze paired session from swing pairs (with individual swing matching data)
 */
function analyzePairedSessionFromSwingPairs(swingPairs: SwingPair[]): PairedSessionAnalysis {
  const pairedSwings = swingPairs.filter(p => p.blastSwing && p.hittraxSwing);
  const blastSwings = swingPairs.map(p => p.blastSwing).filter((s): s is BlastSwing => s !== null);
  const hittraxSwings = swingPairs.map(p => p.hittraxSwing).filter((s): s is HitTraxSwing => s !== null);

  const analysis: PairedSessionAnalysis = {
    batSpeedToExitVeloRatio: null,
    avgBatSpeed: null,
    avgExitVelocity: null,
    angleCorrelation: null,
    avgAttackAngle: null,
    avgLaunchAngle: null,
    angleDifference: null,
    hardHitRate: null,
    avgBatSpeedOnHardHits: null,
    batSpeedCV: null,
    exitVelocityCV: null,
    blastSwingCount: blastSwings.length,
    hittraxSwingCount: hittraxSwings.length,
    swingCountMatch: Math.abs(blastSwings.length - hittraxSwings.length) <= 3, // Within 3 swings
  };

  // Blast metrics
  const batSpeeds = blastSwings.map(s => s.bat_speed).filter((v): v is number => v !== null);
  if (batSpeeds.length > 0) {
    analysis.avgBatSpeed = batSpeeds.reduce((a, b) => a + b) / batSpeeds.length;
    analysis.batSpeedCV = calculateCV(batSpeeds);
  }

  const attackAngles = blastSwings.map(s => s.attack_angle).filter((a): a is number => a !== null);
  if (attackAngles.length > 0) {
    analysis.avgAttackAngle = attackAngles.reduce((a, b) => a + b) / attackAngles.length;
  }

  // HitTrax metrics
  const exitVelocities = hittraxSwings
    .map(s => s.exit_velocity)
    .filter((v): v is number => v !== null && v > 0);

  if (exitVelocities.length > 0) {
    analysis.avgExitVelocity = exitVelocities.reduce((a, b) => a + b) / exitVelocities.length;
    analysis.exitVelocityCV = calculateCV(exitVelocities);

    const hardHits = exitVelocities.filter(ev => ev >= 90).length;
    analysis.hardHitRate = (hardHits / exitVelocities.length) * 100;
  }

  const launchAngles = hittraxSwings.map(s => s.launch_angle).filter((a): a is number => a !== null);
  if (launchAngles.length > 0) {
    analysis.avgLaunchAngle = launchAngles.reduce((a, b) => a + b) / launchAngles.length;
  }

  // Paired metrics (only from matched swings)
  if (pairedSwings.length > 0) {
    const pairedBatSpeeds: number[] = [];
    const pairedExitVelos: number[] = [];
    const pairedAttackAngles: number[] = [];
    const pairedLaunchAngles: number[] = [];

    pairedSwings.forEach(pair => {
      if (pair.blastSwing!.bat_speed && pair.hittraxSwing!.exit_velocity) {
        pairedBatSpeeds.push(pair.blastSwing!.bat_speed);
        pairedExitVelos.push(pair.hittraxSwing!.exit_velocity);
      }

      if (pair.blastSwing!.attack_angle && pair.hittraxSwing!.launch_angle) {
        pairedAttackAngles.push(pair.blastSwing!.attack_angle);
        pairedLaunchAngles.push(pair.hittraxSwing!.launch_angle);
      }
    });

    // Calculate bat speed to exit velo ratio
    if (pairedBatSpeeds.length > 0 && pairedExitVelos.length > 0) {
      const avgPairedBatSpeed = pairedBatSpeeds.reduce((a, b) => a + b) / pairedBatSpeeds.length;
      const avgPairedExitVelo = pairedExitVelos.reduce((a, b) => a + b) / pairedExitVelos.length;
      analysis.batSpeedToExitVeloRatio = avgPairedExitVelo / avgPairedBatSpeed;
    }

    // Calculate angle correlation
    if (pairedAttackAngles.length > 0 && pairedLaunchAngles.length > 0) {
      analysis.angleCorrelation = calculateCorrelation(pairedAttackAngles, pairedLaunchAngles);

      const avgPairedAttack = pairedAttackAngles.reduce((a, b) => a + b) / pairedAttackAngles.length;
      const avgPairedLaunch = pairedLaunchAngles.reduce((a, b) => a + b) / pairedLaunchAngles.length;
      analysis.angleDifference = avgPairedLaunch - avgPairedAttack;
    }

    // Bat speed on hard hits
    const hardHitPairs = pairedSwings.filter(
      p => p.hittraxSwing!.exit_velocity && p.hittraxSwing!.exit_velocity >= 90
    );
    if (hardHitPairs.length > 0) {
      const hardHitBatSpeeds = hardHitPairs
        .map(p => p.blastSwing!.bat_speed)
        .filter((v): v is number => v !== null);

      if (hardHitBatSpeeds.length > 0) {
        analysis.avgBatSpeedOnHardHits = hardHitBatSpeeds.reduce((a, b) => a + b) / hardHitBatSpeeds.length;
      }
    }
  }

  return analysis;
}

// =============================================================================
// Session Matching (Legacy - kept for compatibility)
// =============================================================================

/**
 * Calculate match confidence between Blast and HitTrax sessions
 */
function calculateMatchConfidence(
  blastSession: BlastSession,
  hittraxSession: HitTraxSessionData,
  config: MatchingConfig
): { confidence: number; timeGapMinutes: number } {
  // Calculate time gap between session centers
  const blastCenter = new Date(
    (blastSession.startTime.getTime() + blastSession.endTime.getTime()) / 2
  );
  const hittraxCenter = hittraxSession.session_date;

  const timeGapMinutes = getTimeDifferenceMinutes(blastCenter, hittraxCenter);

  // Base confidence on time proximity (closer = higher confidence)
  let confidence = 1.0 - Math.min(timeGapMinutes / config.maxTimeGapMinutes, 1.0);

  // Bonus for swing count similarity (if enabled)
  if (config.requireSwingCountSimilarity) {
    const countDiff = Math.abs(blastSession.swingCount - hittraxSession.swingCount);
    const avgCount = (blastSession.swingCount + hittraxSession.swingCount) / 2;
    const countSimilarity = 1.0 - Math.min(countDiff / avgCount, 1.0);

    // Weight: 70% time, 30% swing count
    confidence = confidence * 0.7 + countSimilarity * 0.3;
  }

  return { confidence, timeGapMinutes };
}

/**
 * Match Blast sessions with HitTrax sessions using time-window algorithm
 */
export function matchSessions(
  blastSessions: BlastSession[],
  hittraxSessions: HitTraxSessionData[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): PairedSession[] {
  const pairedSessions: PairedSession[] = [];
  const matchedHittraxIds = new Set<string>();
  const matchedBlastDates = new Set<string>();

  // Try to match each Blast session with HitTrax sessions
  blastSessions.forEach((blastSession) => {
    let bestMatch: {
      hittraxSession: HitTraxSessionData;
      confidence: number;
      timeGapMinutes: number;
    } | null = null;

    hittraxSessions.forEach((hittraxSession) => {
      // Skip already matched HitTrax sessions
      if (matchedHittraxIds.has(hittraxSession.session_id)) return;

      const { confidence, timeGapMinutes } = calculateMatchConfidence(
        blastSession,
        hittraxSession,
        config
      );

      // Check if within acceptable time window and above confidence threshold
      if (
        timeGapMinutes <= config.windowMinutes &&
        confidence >= config.minConfidenceThreshold
      ) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { hittraxSession, confidence, timeGapMinutes };
        }
      }
    });

    if (bestMatch) {
      // Found a match!
      matchedHittraxIds.add(bestMatch.hittraxSession.session_id);
      matchedBlastDates.add(blastSession.date);

      pairedSessions.push({
        linkId: null, // Will be set when saved to database
        athleteId: bestMatch.hittraxSession.athlete_id,
        date: blastSession.date,
        blastSession,
        hittraxSession: bestMatch.hittraxSession,
        matchConfidence: bestMatch.confidence,
        matchMethod: 'time_window',
        timeGapMinutes: bestMatch.timeGapMinutes,
        analysis: analyzePairedSession(blastSession, bestMatch.hittraxSession),
      });
    } else {
      // No match found - Blast only session
      pairedSessions.push({
        linkId: null,
        athleteId: blastSession.swings[0].athlete_id,
        date: blastSession.date,
        blastSession,
        hittraxSession: null,
        matchConfidence: 0,
        matchMethod: 'unmatched',
        timeGapMinutes: null,
        analysis: analyzePairedSession(blastSession, null),
      });
      matchedBlastDates.add(blastSession.date);
    }
  });

  // Add unmatched HitTrax sessions
  hittraxSessions.forEach((hittraxSession) => {
    if (!matchedHittraxIds.has(hittraxSession.session_id)) {
      const dateStr = hittraxSession.session_date.toISOString().split('T')[0];
      pairedSessions.push({
        linkId: null,
        athleteId: hittraxSession.athlete_id,
        date: dateStr,
        blastSession: null,
        hittraxSession,
        matchConfidence: 0,
        matchMethod: 'unmatched',
        timeGapMinutes: null,
        analysis: analyzePairedSession(null, hittraxSession),
      });
    }
  });

  // Sort by date descending
  return pairedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// =============================================================================
// Session Analysis
// =============================================================================

/**
 * Analyze a paired session to generate insights
 */
export function analyzePairedSession(
  blastSession: BlastSession | null,
  hittraxSession: HitTraxSessionData | null
): PairedSessionAnalysis {
  const analysis: PairedSessionAnalysis = {
    batSpeedToExitVeloRatio: null,
    avgBatSpeed: null,
    avgExitVelocity: null,
    angleCorrelation: null,
    avgAttackAngle: null,
    avgLaunchAngle: null,
    angleDifference: null,
    hardHitRate: null,
    avgBatSpeedOnHardHits: null,
    batSpeedCV: null,
    exitVelocityCV: null,
    blastSwingCount: blastSession?.swingCount || 0,
    hittraxSwingCount: hittraxSession?.swingCount || 0,
    swingCountMatch: false,
  };

  // Check swing count match (within 20%)
  if (blastSession && hittraxSession) {
    const avgCount = (blastSession.swingCount + hittraxSession.swingCount) / 2;
    const countDiff = Math.abs(blastSession.swingCount - hittraxSession.swingCount);
    analysis.swingCountMatch = countDiff / avgCount <= 0.2;
  }

  // Blast-only metrics
  if (blastSession) {
    analysis.avgBatSpeed = blastSession.avgBatSpeed;
    analysis.avgAttackAngle = blastSession.avgAttackAngle;

    const batSpeeds = blastSession.swings
      .map((s) => s.bat_speed)
      .filter((v): v is number => v !== null);
    analysis.batSpeedCV = calculateCV(batSpeeds);
  }

  // HitTrax-only metrics
  if (hittraxSession) {
    analysis.avgExitVelocity = hittraxSession.avgExitVelocity;
    analysis.avgLaunchAngle = hittraxSession.avgLaunchAngle;
    analysis.hardHitRate = hittraxSession.hardHitRate;

    const exitVelocities = hittraxSession.swings
      .map((s) => s.exit_velocity)
      .filter((v): v is number => v !== null && v > 0);
    analysis.exitVelocityCV = calculateCV(exitVelocities);
  }

  // Combined metrics (both systems available)
  if (blastSession && hittraxSession && blastSession.avgBatSpeed && hittraxSession.avgExitVelocity) {
    analysis.batSpeedToExitVeloRatio = hittraxSession.avgExitVelocity / blastSession.avgBatSpeed;

    if (blastSession.avgAttackAngle && hittraxSession.avgLaunchAngle) {
      analysis.angleDifference = hittraxSession.avgLaunchAngle - blastSession.avgAttackAngle;

      // Try to calculate angle correlation (if we have enough swing pairs)
      const attackAngles: number[] = [];
      const launchAngles: number[] = [];

      // This is simplified - in reality, we'd need to match individual swings by timestamp
      // For now, just use the averages as a placeholder
      // TODO: Implement swing-by-swing matching for true correlation
    }
  }

  return analysis;
}
