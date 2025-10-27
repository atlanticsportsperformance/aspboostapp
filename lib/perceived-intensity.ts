/**
 * Perceived Intensity Correction for Throwing Exercises
 *
 * Based on research from Slenker et al (2014), Wilk et al (2002)
 *
 * When athletes are told to throw at X% effort, they actually throw at a higher % of their max.
 * This is especially important for bullpen work and throwing drills.
 *
 * Example: A pitcher told to throw at "60% effort" will actually throw at ~80% of their max velocity.
 */

/**
 * Mapping of PERCEIVED intensity to APPROXIMATE ACTUAL intensity
 *
 * Key insight: When you tell an athlete "throw at 60%", they perceive that as moderate effort
 * but biomechanically produce ~80% of their maximum output.
 */
export const PERCEIVED_TO_ACTUAL_MAP: Record<number, number> = {
  15: 35,
  20: 40,
  25: 45,
  30: 50,
  35: 55,
  40: 60,
  45: 65,
  50: 70,
  55: 75,
  60: 80,
  65: 84,
  70: 86,
  75: 88,
  80: 90,
  85: 92,
  90: 94,
  95: 96,
  100: 99
};

/**
 * Get the actual intensity percentage that corresponds to a perceived intensity
 *
 * @param perceivedPercent - The intensity percentage the coach prescribes (what they tell the athlete)
 * @returns The actual intensity percentage the athlete will produce
 *
 * @example
 * getActualIntensity(60) // Returns 80 (athlete told "60%" will actually throw at 80% max)
 */
export function getActualIntensity(perceivedPercent: number): number {
  // Clamp to valid range
  if (perceivedPercent <= 0) return 0;
  if (perceivedPercent >= 100) return 99;

  // Round to nearest 5% for lookup
  const rounded = Math.round(perceivedPercent / 5) * 5;

  if (PERCEIVED_TO_ACTUAL_MAP[rounded]) {
    return PERCEIVED_TO_ACTUAL_MAP[rounded];
  }

  // If exact match not found, interpolate between nearest values
  const lower = Math.floor(perceivedPercent / 5) * 5;
  const upper = Math.ceil(perceivedPercent / 5) * 5;

  const lowerActual = PERCEIVED_TO_ACTUAL_MAP[lower] || lower;
  const upperActual = PERCEIVED_TO_ACTUAL_MAP[upper] || upper;

  // Linear interpolation
  const ratio = (perceivedPercent - lower) / (upper - lower);
  return Math.round(lowerActual + (upperActual - lowerActual) * ratio);
}

/**
 * Calculate target value for a throwing exercise using perceived intensity correction
 *
 * @param maxValue - The athlete's personal record for this metric (e.g., 100 mph)
 * @param perceivedPercent - The prescribed intensity (e.g., 60%)
 * @param exerciseCategory - The exercise category (only applies correction for "throwing")
 * @returns The target value the athlete should aim for
 *
 * @example
 * // Pitcher with 100 mph max, prescribed 60% effort
 * calculateThrowingTarget(100, 60, "throwing") // Returns 80 (80% of 100 mph = 80 mph)
 *
 * // Strength exercise with 225 lbs max, prescribed 60%
 * calculateThrowingTarget(225, 60, "strength_conditioning") // Returns 135 (60% of 225 = 135 lbs, no correction)
 */
export function calculateThrowingTarget(
  maxValue: number,
  perceivedPercent: number,
  exerciseCategory?: string
): number {
  // Only apply perceived intensity correction for throwing exercises
  if (exerciseCategory === 'throwing') {
    const actualPercent = getActualIntensity(perceivedPercent);
    return Math.round(maxValue * (actualPercent / 100) * 10) / 10; // Round to 1 decimal
  }

  // For non-throwing exercises, use the prescribed percentage directly
  return Math.round(maxValue * (perceivedPercent / 100) * 10) / 10;
}

/**
 * Check if an exercise should use perceived intensity correction
 *
 * @param exerciseCategory - The category from the exercise table
 * @returns true if the exercise is a throwing exercise
 */
export function shouldUsePerceivedIntensity(exerciseCategory?: string): boolean {
  return exerciseCategory === 'throwing';
}

/**
 * Get a human-readable description of the intensity for UI display
 *
 * @param perceivedPercent - The prescribed intensity percentage
 * @returns A descriptive label
 */
export function getIntensityLabel(perceivedPercent: number): string {
  if (perceivedPercent <= 25) return 'Very Light';
  if (perceivedPercent <= 40) return 'Light';
  if (perceivedPercent <= 55) return 'Moderate';
  if (perceivedPercent <= 70) return 'Hard';
  if (perceivedPercent <= 85) return 'Very Hard';
  return 'Maximum';
}
