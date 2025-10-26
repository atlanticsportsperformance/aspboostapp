// Store VALD test data in Supabase
// Adapted from Prisma to Supabase client

import { SupabaseClient } from '@supabase/supabase-js';
import { Trial } from './forcedecks-api';
import { SimpleVALDForceDecksAPI } from './forcedecks-api';

interface CountMap {
  count: number;
  value: number | string;
}

/**
 * Store CMJ (Countermovement Jump) test data
 */
export async function storeCMJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    const data = [];

    for (const trial of trials) {
      const trialData: Record<string, unknown> = {
        athlete_id: athleteId,
        test_id: testId,
        recorded_utc: new Date(trial.recordedUTC).toISOString(),
        recorded_timezone: trial.recordedTimezone,
      };

      // Map each result to the appropriate field
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        trialData[valueKey] = result.value;
        trialData[unitKey] = result.definition.unit;
      }

      data.push(trialData);
    }

    // Insert into Supabase
    const { error } = await supabase
      .from('cmj_tests')
      .insert(data);

    if (error) {
      console.error('Error storing CMJ test:', error);
      return false;
    }

    console.log(`✅ Stored ${data.length} CMJ trial(s) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeCMJTest:', error);
    return false;
  }
}

/**
 * Store SJ (Squat Jump) test data
 */
export async function storeSJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    const data = [];

    for (const trial of trials) {
      const trialData: Record<string, unknown> = {
        athlete_id: athleteId,
        test_id: testId,
        recorded_utc: new Date(trial.recordedUTC).toISOString(),
        recorded_timezone: trial.recordedTimezone,
      };

      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        trialData[valueKey] = result.value;
        trialData[unitKey] = result.definition.unit;
      }

      data.push(trialData);
    }

    const { error } = await supabase
      .from('sj_tests')
      .insert(data);

    if (error) {
      console.error('Error storing SJ test:', error);
      return false;
    }

    console.log(`✅ Stored ${data.length} SJ trial(s) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeSJTest:', error);
    return false;
  }
}

/**
 * Store HJ (Hop) test data
 * Note: HJ tests average values across multiple trials
 */
export async function storeHJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    const data = [];
    const averageMap: Map<string, CountMap> = new Map();

    for (const trial of trials) {
      const trialData: Record<string, unknown> = {
        athlete_id: athleteId,
        test_id: testId,
        recorded_utc: new Date(trial.recordedUTC).toISOString(),
        recorded_timezone: trial.recordedTimezone,
      };

      // Accumulate values for averaging
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Average numeric values across trials
        if (!averageMap.has(valueKey)) {
          averageMap.set(valueKey, { count: 1, value: result.value });
        } else {
          const countMap = averageMap.get(valueKey);
          if (countMap && typeof countMap.value === 'number' && typeof result.value === 'number') {
            countMap.count++;
            countMap.value += result.value;
          }
        }

        // Store unit (doesn't need averaging)
        if (!averageMap.has(unitKey)) {
          averageMap.set(unitKey, { count: 1, value: result.definition.unit });
        }
      }

      // Apply averaged values
      for (const [key, value] of averageMap) {
        if (typeof value.value === "number") {
          trialData[key] = value.value / value.count;
        } else {
          trialData[key] = value.value;
        }
      }

      data.push(trialData);
      averageMap.clear();
    }

    const { error } = await supabase
      .from('hj_tests')
      .insert(data);

    if (error) {
      console.error('Error storing HJ test:', error);
      return false;
    }

    console.log(`✅ Stored ${data.length} HJ trial(s) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeHJTest:', error);
    return false;
  }
}

/**
 * Store PPU (Prone Push-Up) test data
 */
export async function storePPUTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    const data = [];

    for (const trial of trials) {
      const trialData: Record<string, unknown> = {
        athlete_id: athleteId,
        test_id: testId,
        recorded_utc: new Date(trial.recordedUTC).toISOString(),
        recorded_timezone: trial.recordedTimezone,
      };

      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        trialData[valueKey] = result.value;
        trialData[unitKey] = result.definition.unit;
      }

      data.push(trialData);
    }

    const { error } = await supabase
      .from('ppu_tests')
      .insert(data);

    if (error) {
      console.error('Error storing PPU test:', error);
      return false;
    }

    console.log(`✅ Stored ${data.length} PPU trial(s) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storePPUTest:', error);
    return false;
  }
}

/**
 * Store IMTP (Isometric Mid-Thigh Pull) test data
 * Note: IMTP requires body weight to calculate NET_PEAK_VERTICAL_FORCE and RELATIVE_STRENGTH
 */
export async function storeIMTPTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string,
  valdProfileId: string
): Promise<boolean> {
  try {
    // Get body weight from the VALD test metadata
    const valdForceDecksAPI = new SimpleVALDForceDecksAPI();
    const valdTest = await valdForceDecksAPI.getTest(testId, valdProfileId);

    if (!valdTest || typeof valdTest.weight !== "number") {
      console.error(`Body weight not found for test ${testId}`);
      return false;
    }

    const bodyWeightN = valdTest.weight * 9.81; // Convert kg to Newtons
    const data = [];

    for (const trial of trials) {
      const trialData: Record<string, unknown> = {
        athlete_id: athleteId,
        test_id: testId,
        recorded_utc: new Date(trial.recordedUTC).toISOString(),
        recorded_timezone: trial.recordedTimezone,
      };

      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        trialData[valueKey] = result.value;
        trialData[unitKey] = result.definition.unit;
      }

      data.push(trialData);
    }

    // Calculate NET_PEAK_VERTICAL_FORCE and RELATIVE_STRENGTH for each trial
    for (const trial of data) {
      const peakForce = trial.peak_vertical_force_trial_value as number;
      if (typeof peakForce === 'number') {
        const netPeakVerticalForce = peakForce - bodyWeightN;
        const relativeStrength = netPeakVerticalForce / bodyWeightN;

        trial.net_peak_vertical_force_trial_value = netPeakVerticalForce;
        trial.net_peak_vertical_force_trial_unit = "N";
        trial.relative_strength_trial_value = relativeStrength;
        trial.relative_strength_trial_unit = "N";
      }
    }

    const { error } = await supabase
      .from('imtp_tests')
      .insert(data);

    if (error) {
      console.error('Error storing IMTP test:', error);
      return false;
    }

    console.log(`✅ Stored ${data.length} IMTP trial(s) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeIMTPTest:', error);
    return false;
  }
}

/**
 * Get the latest test date for an athlete across all test types
 * Used to determine the starting point for incremental syncs
 */
export async function getLatestTestDate(
  supabase: SupabaseClient,
  athleteId: string
): Promise<Date> {
  try {
    const tables = ['cmj_tests', 'sj_tests', 'hj_tests', 'ppu_tests', 'imtp_tests'];
    let latestDate = new Date(0); // Unix epoch

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('recorded_utc')
        .eq('athlete_id', athleteId)
        .order('recorded_utc', { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.recorded_utc) {
        const testDate = new Date(data.recorded_utc);
        if (testDate > latestDate) {
          latestDate = testDate;
        }
      }
    }

    return latestDate;
  } catch (error) {
    console.error('Error getting latest test date:', error);
    return new Date(0);
  }
}
