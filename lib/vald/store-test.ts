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
 * Convert column name to match the broken SJ table format with underscores between every character
 * Example: "bodymass_relative_mean_power" -> "_b_o_d_y_m_a_s_s__r_e_l_a_t_i_v_e__m_e_a_n__p_o_w_e_r"
 */
function convertToSJColumnFormat(columnName: string): string {
  // Split by underscore to get words
  const words = columnName.split('_');

  // For each word, insert underscore between each character
  const convertedWords = words.map(word => {
    return word.split('').join('_');
  });

  // Join words with double underscore
  return '_' + convertedWords.join('__');
}

/**
 * Store CMJ (Countermovement Jump) test data
 * Averages all trials into a single row
 */
export async function storeCMJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    if (trials.length === 0) return false;

    // Use first trial's timestamp and timezone
    const firstTrial = trials[0];
    const trialData: Record<string, unknown> = {
      athlete_id: athleteId,
      test_id: testId,
      recorded_utc: new Date(firstTrial.recordedUTC).toISOString(),
      recorded_timezone: firstTrial.recordedTimezone,
    };

    // Accumulate values for averaging
    const valueAccumulator = new Map<string, number[]>();
    const units = new Map<string, string>();

    for (const trial of trials) {
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Accumulate numeric values
        if (typeof result.value === 'number') {
          if (!valueAccumulator.has(valueKey)) {
            valueAccumulator.set(valueKey, []);
          }
          valueAccumulator.get(valueKey)!.push(result.value);
        }

        // Store unit (same across trials)
        units.set(unitKey, result.definition.unit);
      }
    }

    // Calculate averages
    for (const [key, values] of valueAccumulator) {
      trialData[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Add units
    for (const [key, unit] of units) {
      trialData[key] = unit;
    }

    // Insert into Supabase (upsert to handle duplicates)
    const { error } = await supabase
      .from('cmj_tests')
      .upsert(trialData, { onConflict: 'athlete_id,test_id' });

    if (error) {
      console.error('Error storing CMJ test:', error);
      return false;
    }

    console.log(`✅ Stored CMJ test (averaged ${trials.length} trial(s)) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeCMJTest:', error);
    return false;
  }
}

/**
 * Store SJ (Squat Jump) test data
 * Averages all trials into a single row
 */
export async function storeSJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    if (trials.length === 0) return false;

    // Use first trial's timestamp and timezone
    const firstTrial = trials[0];
    const trialData: Record<string, unknown> = {
      athlete_id: athleteId,
      test_id: testId,
      recorded_utc: new Date(firstTrial.recordedUTC).toISOString(),
      recorded_timezone: firstTrial.recordedTimezone,
    };

    // Accumulate values for averaging
    const valueAccumulator = new Map<string, number[]>();
    const units = new Map<string, string>();

    for (const trial of trials) {
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Accumulate numeric values
        if (typeof result.value === 'number') {
          if (!valueAccumulator.has(valueKey)) {
            valueAccumulator.set(valueKey, []);
          }
          valueAccumulator.get(valueKey)!.push(result.value);
        }

        // Store unit (same across trials)
        units.set(unitKey, result.definition.unit);
      }
    }

    // Calculate averages
    for (const [key, values] of valueAccumulator) {
      trialData[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Add units
    for (const [key, unit] of units) {
      trialData[key] = unit;
    }

    // Try to upsert, and if we get a column not found error, retry with only *_value columns (skip *_unit columns)
    let { error } = await supabase
      .from('sj_tests')
      .upsert(trialData, { onConflict: 'athlete_id,test_id' });

    if (error && error.code === 'PGRST204') {
      // Column not found in schema - filter to only insert columns that don't have missing dependencies
      console.log('⚠️ Schema mismatch detected, filtering columns...');

      // Keep only core columns and *_value columns (skip *_unit columns which are less critical)
      const filteredData: Record<string, unknown> = {
        athlete_id: trialData.athlete_id,
        test_id: trialData.test_id,
        recorded_utc: trialData.recorded_utc,
        recorded_timezone: trialData.recorded_timezone,
      };

      for (const [key, value] of Object.entries(trialData)) {
        // Skip unit columns since they're causing issues and are less critical than values
        if (!key.endsWith('_unit') && !['athlete_id', 'test_id', 'recorded_utc', 'recorded_timezone'].includes(key)) {
          filteredData[key] = value;
        }
      }

      console.log(`SJ test: Retrying with ${Object.keys(filteredData).length} columns (skipped ${Object.keys(trialData).length - Object.keys(filteredData).length} unit columns)`);

      const retryResult = await supabase
        .from('sj_tests')
        .upsert(filteredData, { onConflict: 'athlete_id,test_id' });

      if (retryResult.error) {
        console.error('❌ ERROR storing SJ test after filtering:', retryResult.error);
        console.error('   Error message:', retryResult.error.message);
        return false;
      }
    } else if (error) {
      console.error('❌ ERROR storing SJ test:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      return false;
    }

    console.log(`✅ Stored SJ test (averaged ${trials.length} trial(s)) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeSJTest:', error);
    return false;
  }
}

/**
 * Store HJ (Hop) test data
 * Averages all trials into a single row
 */
export async function storeHJTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    if (trials.length === 0) return false;

    // Use first trial's timestamp and timezone
    const firstTrial = trials[0];
    const trialData: Record<string, unknown> = {
      athlete_id: athleteId,
      test_id: testId,
      recorded_utc: new Date(firstTrial.recordedUTC).toISOString(),
      recorded_timezone: firstTrial.recordedTimezone,
    };

    // Accumulate values for averaging
    const valueAccumulator = new Map<string, number[]>();
    const units = new Map<string, string>();

    for (const trial of trials) {
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Accumulate numeric values
        if (typeof result.value === 'number') {
          if (!valueAccumulator.has(valueKey)) {
            valueAccumulator.set(valueKey, []);
          }
          valueAccumulator.get(valueKey)!.push(result.value);
        }

        // Store unit (same across trials)
        units.set(unitKey, result.definition.unit);
      }
    }

    // Calculate averages
    for (const [key, values] of valueAccumulator) {
      trialData[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Add units
    for (const [key, unit] of units) {
      trialData[key] = unit;
    }

    const { error } = await supabase
      .from('hj_tests')
      .upsert(trialData, { onConflict: 'athlete_id,test_id' });

    if (error) {
      console.error('Error storing HJ test:', error);
      return false;
    }

    console.log(`✅ Stored HJ test (averaged ${trials.length} trial(s)) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storeHJTest:', error);
    return false;
  }
}

/**
 * Store PPU (Plyo Push-Up) test data
 * Averages all trials into a single row
 */
export async function storePPUTest(
  supabase: SupabaseClient,
  trials: Trial[],
  testId: string,
  athleteId: string
): Promise<boolean> {
  try {
    if (trials.length === 0) return false;

    // Use first trial's timestamp and timezone
    const firstTrial = trials[0];
    const trialData: Record<string, unknown> = {
      athlete_id: athleteId,
      test_id: testId,
      recorded_utc: new Date(firstTrial.recordedUTC).toISOString(),
      recorded_timezone: firstTrial.recordedTimezone,
    };

    // Accumulate values for averaging
    const valueAccumulator = new Map<string, number[]>();
    const units = new Map<string, string>();

    for (const trial of trials) {
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Accumulate numeric values
        if (typeof result.value === 'number') {
          if (!valueAccumulator.has(valueKey)) {
            valueAccumulator.set(valueKey, []);
          }
          valueAccumulator.get(valueKey)!.push(result.value);
        }

        // Store unit (same across trials)
        units.set(unitKey, result.definition.unit);
      }
    }

    // Calculate averages
    for (const [key, values] of valueAccumulator) {
      trialData[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Add units
    for (const [key, unit] of units) {
      trialData[key] = unit;
    }

    // Filter out any fields that don't exist in the table schema
    // This prevents errors when VALD API returns new/unexpected fields
    const validColumns = new Set([
      'athlete_id', 'test_id', 'recorded_utc', 'recorded_timezone',
      'peak_takeoff_force_trial_value', 'peak_takeoff_force_trial_unit',
      'mean_flight_time_trial_value', 'mean_flight_time_trial_unit',
      'peak_landing_force_trial_value', 'peak_landing_force_trial_unit',
      'contraction_time_trial_value', 'contraction_time_trial_unit',
      'push_up_rsi_trial_value', 'push_up_rsi_trial_unit',
      'braking_rfd_trial_value', 'braking_rfd_trial_unit',
      'propulsive_rfd_trial_value', 'propulsive_rfd_trial_unit',
      'peak_propulsive_power_trial_value', 'peak_propulsive_power_trial_unit',
    ]);

    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(trialData)) {
      if (validColumns.has(key)) {
        filteredData[key] = value;
      } else {
        console.warn(`⚠️  Skipping unknown PPU column: ${key}`);
      }
    }

    const { error } = await supabase
      .from('ppu_tests')
      .upsert(filteredData, { onConflict: 'athlete_id,test_id' });

    if (error) {
      console.error('Error storing PPU test:', error);
      return false;
    }

    console.log(`✅ Stored PPU test (averaged ${trials.length} trial(s)) for test ${testId}`);
    return true;
  } catch (error) {
    console.error('Error in storePPUTest:', error);
    return false;
  }
}

/**
 * Store IMTP (Isometric Mid-Thigh Pull) test data
 * Averages all trials into a single row
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
    if (trials.length === 0) return false;

    // Get body weight from the VALD test metadata
    const valdForceDecksAPI = new SimpleVALDForceDecksAPI();
    const valdTest = await valdForceDecksAPI.getTest(testId, valdProfileId);

    if (!valdTest || typeof valdTest.weight !== "number") {
      console.error(`Body weight not found for test ${testId}`);
      return false;
    }

    const bodyWeightN = valdTest.weight * 9.81; // Convert kg to Newtons

    // Use first trial's timestamp and timezone
    const firstTrial = trials[0];
    const trialData: Record<string, unknown> = {
      athlete_id: athleteId,
      test_id: testId,
      recorded_utc: new Date(firstTrial.recordedUTC).toISOString(),
      recorded_timezone: firstTrial.recordedTimezone,
    };

    // Accumulate values for averaging
    const valueAccumulator = new Map<string, number[]>();
    const units = new Map<string, string>();

    for (const trial of trials) {
      for (const result of trial.results) {
        const name = result.definition.result.toLowerCase();
        const limbKey = result.limb === "Asym" ? "asymm" : result.limb.toLowerCase();
        const valueKey = `${name}_${limbKey}_value`;
        const unitKey = `${name}_${limbKey}_unit`;

        // Accumulate numeric values
        if (typeof result.value === 'number') {
          if (!valueAccumulator.has(valueKey)) {
            valueAccumulator.set(valueKey, []);
          }
          valueAccumulator.get(valueKey)!.push(result.value);
        }

        // Store unit (same across trials)
        units.set(unitKey, result.definition.unit);
      }
    }

    // Calculate averages
    for (const [key, values] of valueAccumulator) {
      trialData[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // Add units
    for (const [key, unit] of units) {
      trialData[key] = unit;
    }

    // Calculate NET_PEAK_VERTICAL_FORCE and RELATIVE_STRENGTH using averaged peak force
    const peakForce = trialData.peak_vertical_force_trial_value as number;
    if (typeof peakForce === 'number') {
      const netPeakVerticalForce = peakForce - bodyWeightN;
      const relativeStrength = netPeakVerticalForce / bodyWeightN;

      trialData.net_peak_vertical_force_trial_value = netPeakVerticalForce;
      trialData.net_peak_vertical_force_trial_unit = "N";
      trialData.relative_strength_trial_value = relativeStrength;
      trialData.relative_strength_trial_unit = "N";
    }

    const { error } = await supabase
      .from('imtp_tests')
      .upsert(trialData, { onConflict: 'athlete_id,test_id' });

    if (error) {
      console.error('Error storing IMTP test:', error);
      return false;
    }

    console.log(`✅ Stored IMTP test (averaged ${trials.length} trial(s)) for test ${testId}`);
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
        .limit(1);

      if (!error && data && data.length > 0 && data[0]?.recorded_utc) {
        const testDate = new Date(data[0].recorded_utc);
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
