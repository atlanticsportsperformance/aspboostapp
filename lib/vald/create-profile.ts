// Helper functions for creating and linking VALD profiles to athletes
// Call these when creating new athletes in your system

import { SupabaseClient } from '@supabase/supabase-js';
import { ValdProfileApi } from './profile-api';
import { randomUUID } from 'crypto';

export interface CreateVALDProfileParams {
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
  sex: 'M' | 'F' | 'Male' | 'Female';
}

/**
 * Create a VALD profile for an athlete and link it to their record
 * This should be called after creating an athlete in your system
 *
 * @param supabase - Supabase client
 * @param params - Athlete information
 * @returns The VALD profile ID
 */
export async function createAndLinkVALDProfile(
  supabase: SupabaseClient,
  params: CreateVALDProfileParams
): Promise<string | null> {
  try {
    console.log(`Creating VALD profile for athlete ${params.athleteId}...`);

    // DUPLICATE CHECK #1: Check if this athlete already has a VALD profile
    const { data: existingAthlete, error: checkError } = await supabase
      .from('athletes')
      .select('vald_profile_id, vald_sync_id')
      .eq('id', params.athleteId)
      .single();

    if (checkError) {
      console.error('Error checking existing athlete:', checkError);
      throw checkError;
    }

    if (existingAthlete?.vald_profile_id) {
      console.warn(`⚠️ Athlete ${params.athleteId} already has VALD profile: ${existingAthlete.vald_profile_id}`);
      return existingAthlete.vald_profile_id;
    }

    if (existingAthlete?.vald_sync_id) {
      console.log(`✅ Athlete ${params.athleteId} has syncId but no profileId. Attempting to resolve...`);
      // Try to get the profileId from VALD
      const valdProfileApi = new ValdProfileApi();
      const resolvedProfileId = await valdProfileApi.getAthlete(existingAthlete.vald_sync_id);
      if (resolvedProfileId) {
        // Update and return
        await supabase
          .from('athletes')
          .update({ vald_profile_id: resolvedProfileId })
          .eq('id', params.athleteId);
        return resolvedProfileId;
      }
    }

    // DUPLICATE CHECK #3: Check if there's already a pending queue item
    const { data: existingQueue } = await supabase
      .from('vald_profile_queue')
      .select('id, status')
      .eq('athlete_id', params.athleteId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (existingQueue && existingQueue.length > 0) {
      console.warn(`⚠️ Athlete ${params.athleteId} already has a ${existingQueue[0].status} profile creation in queue`);
      throw new Error(`Profile creation already ${existingQueue[0].status} for this athlete`);
    }

    // CRITICAL: Search for existing VALD profile by email FIRST
    // This prevents duplicate profile creation
    const valdProfileApi = new ValdProfileApi();

    console.log(`🔍 Searching for existing VALD profile with email: ${params.email}`);
    const existingProfile = await valdProfileApi.searchByEmail(params.email);

    if (existingProfile) {
      console.log(`✅ Found existing VALD profile for ${params.email}: ${existingProfile.profileId}`);

      // Link the existing profile instead of creating a new one
      const { error } = await supabase
        .from('athletes')
        .update({
          vald_profile_id: existingProfile.profileId,
          vald_sync_id: existingProfile.syncId,
          vald_external_id: existingProfile.externalId,
          vald_synced_at: new Date().toISOString(),
        })
        .eq('id', params.athleteId);

      if (error) {
        console.error('Error linking existing VALD profile:', error);
        throw error;
      }

      console.log(`✅ Linked existing VALD profile ${existingProfile.profileId} to athlete ${params.athleteId}`);
      return existingProfile.profileId;
    }

    console.log(`❌ No existing VALD profile found for ${params.email}. Creating new profile...`);

    // Generate UUIDs for VALD sync
    const syncId = randomUUID();
    const externalId = randomUUID();

    // Normalize sex to single character for VALD
    const sex = params.sex.toUpperCase().startsWith('M') ? 'M' : 'F';

    // Create NEW profile in VALD system
    await valdProfileApi.createAthlete({
      dateOfBirth: params.birthDate,
      email: params.email,
      givenName: params.firstName,
      familyName: params.lastName,
      sex: sex,
      syncId: syncId,
      externalId: externalId,
    });

    console.log('✅ NEW VALD profile created, waiting for profileId...');

    // Wait a moment for VALD to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the profileId from VALD
    const profileId = await valdProfileApi.getAthlete(syncId);

    if (!profileId) {
      console.warn('⚠️ VALD profile created but profileId not yet available. Will retry later.');

      // Update athlete with sync IDs (profileId will be populated on first sync)
      const { error } = await supabase
        .from('athletes')
        .update({
          vald_sync_id: syncId,
          vald_external_id: externalId,
          vald_synced_at: new Date().toISOString(),
        })
        .eq('id', params.athleteId);

      if (error) {
        console.error('Error updating athlete with VALD sync IDs:', error);
        throw error;
      }

      return null;
    }

    // Update athlete record with VALD profile information
    const { error } = await supabase
      .from('athletes')
      .update({
        vald_profile_id: profileId,
        vald_sync_id: syncId,
        vald_external_id: externalId,
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', params.athleteId);

    if (error) {
      console.error('Error updating athlete with VALD profile:', error);
      throw error;
    }

    console.log(`✅ Linked VALD profile ${profileId} to athlete ${params.athleteId}`);
    return profileId;
  } catch (error) {
    console.error('Error creating VALD profile:', error);

    // Queue for retry
    try {
      await supabase
        .from('vald_profile_queue')
        .insert({
          athlete_id: params.athleteId,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    } catch (queueError) {
      console.error('Error queuing VALD profile creation:', queueError);
    }

    return null;
  }
}

/**
 * Resolve and update profileId for an athlete who has syncId but not profileId
 * Useful for athletes created before VALD API was available
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete ID
 * @returns The resolved profile ID
 */
export async function resolveVALDProfileId(
  supabase: SupabaseClient,
  athleteId: string
): Promise<string | null> {
  try {
    // Get athlete's syncId
    const { data: athlete, error } = await supabase
      .from('athletes')
      .select('vald_sync_id, vald_profile_id')
      .eq('id', athleteId)
      .single();

    if (error || !athlete) {
      console.error('Error fetching athlete:', error);
      return null;
    }

    // Already has profileId
    if (athlete.vald_profile_id) {
      return athlete.vald_profile_id;
    }

    // No syncId means no VALD profile was created
    if (!athlete.vald_sync_id) {
      console.warn('Athlete has no VALD sync ID');
      return null;
    }

    // Query VALD for the profileId
    const valdProfileApi = new ValdProfileApi();
    const profileId = await valdProfileApi.getAthlete(athlete.vald_sync_id);

    if (!profileId) {
      console.warn('VALD profileId still not available');
      return null;
    }

    // Update athlete with profileId
    const { error: updateError } = await supabase
      .from('athletes')
      .update({
        vald_profile_id: profileId,
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Error updating profileId:', updateError);
      return null;
    }

    console.log(`✅ Resolved profileId ${profileId} for athlete ${athleteId}`);
    return profileId;
  } catch (error) {
    console.error('Error resolving VALD profileId:', error);
    return null;
  }
}

/**
 * Manually link an existing VALD profile to an athlete
 * Use this if an athlete already has a VALD profile
 *
 * @param supabase - Supabase client
 * @param athleteId - Athlete ID in your system
 * @param valdProfileId - Existing VALD profile ID
 */
export async function linkExistingVALDProfile(
  supabase: SupabaseClient,
  athleteId: string,
  valdProfileId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('athletes')
      .update({
        vald_profile_id: valdProfileId,
        vald_synced_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    if (error) {
      console.error('Error linking VALD profile:', error);
      return false;
    }

    console.log(`✅ Linked existing VALD profile ${valdProfileId} to athlete ${athleteId}`);
    return true;
  } catch (error) {
    console.error('Error linking VALD profile:', error);
    return false;
  }
}

/**
 * Process queued VALD profile creations
 * Run this periodically to retry failed profile creations
 */
export async function processVALDProfileQueue(supabase: SupabaseClient): Promise<number> {
  try {
    // Get pending/failed queue items
    const { data: queueItems, error } = await supabase
      .from('vald_profile_queue')
      .select('*, athletes(first_name, last_name, birth_date, email, sex)')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', 3)
      .limit(10);

    if (error || !queueItems || queueItems.length === 0) {
      return 0;
    }

    let processed = 0;

    for (const item of queueItems) {
      const athlete = item.athletes;

      if (!athlete) {
        continue;
      }

      try {
        // Mark as processing
        await supabase
          .from('vald_profile_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Attempt to create profile
        const profileId = await createAndLinkVALDProfile(supabase, {
          athleteId: item.athlete_id,
          firstName: athlete.first_name,
          lastName: athlete.last_name,
          email: athlete.email,
          birthDate: new Date(athlete.birth_date),
          sex: athlete.sex,
        });

        if (profileId) {
          // Success - mark as completed
          await supabase
            .from('vald_profile_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          processed++;
        } else {
          // Failed but will retry
          await supabase
            .from('vald_profile_queue')
            .update({
              status: 'failed',
              retry_count: (item.retry_count || 0) + 1,
              error_message: 'ProfileId not yet available',
            })
            .eq('id', item.id);
        }
      } catch (error) {
        // Error - mark as failed
        await supabase
          .from('vald_profile_queue')
          .update({
            status: 'failed',
            retry_count: (item.retry_count || 0) + 1,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', item.id);
      }
    }

    return processed;
  } catch (error) {
    console.error('Error processing VALD profile queue:', error);
    return 0;
  }
}
