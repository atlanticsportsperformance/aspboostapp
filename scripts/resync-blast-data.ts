// Re-sync Blast Motion data with correct date parsing
import { createClient } from '@supabase/supabase-js';
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function resyncBlastData() {
  // Create Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const blastUsername = process.env.BLAST_MOTION_USERNAME;
  const blastPassword = process.env.BLAST_MOTION_PASSWORD;

  if (!supabaseUrl || !supabaseServiceKey || !blastUsername || !blastPassword) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    console.log('\n🔄 Re-syncing Blast Motion data with correct dates...\n');

    // Get athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, blast_player_id')
      .eq('blast_player_id', 506872)
      .single();

    if (athleteError || !athlete) {
      console.error('❌ Could not find athlete');
      return;
    }

    console.log(`   Athlete: ${athlete.first_name} ${athlete.last_name}`);
    console.log(`   Blast Player ID: ${athlete.blast_player_id}\n`);

    // Fetch swings from Blast Motion API (last 365 days)
    const api = createBlastMotionAPI(blastUsername, blastPassword);
    const dateEnd = new Date().toISOString().split('T')[0];
    const dateStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`   Date range: ${dateStart} to ${dateEnd}\n`);

    const allSwings = await api.getAllPlayerSwings(athlete.blast_player_id, {
      dateStart,
      dateEnd,
    });

    console.log(`\n✅ Fetched ${allSwings.length} swings from Blast Motion API\n`);

    // Insert swings with correct date parsing
    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const swing of allSwings) {
      try {
        // Check if swing already exists
        const { data: existing } = await supabase
          .from('blast_swings')
          .select('id')
          .eq('athlete_id', athlete.id)
          .eq('blast_id', swing.blast_id)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Parse created_at string correctly
        let recordedDate: string;
        let recordedTime: string;
        let createdAtUtc: string;

        if (swing.created_at && typeof swing.created_at === 'string') {
          // Parse "YYYY-MM-DD HH:MM:SS" format
          const parts = swing.created_at.split(' ');
          recordedDate = parts[0] || new Date().toISOString().split('T')[0];
          recordedTime = parts[1] || '00:00:00';
          createdAtUtc = new Date(`${recordedDate}T${recordedTime}Z`).toISOString();
        } else {
          const now = new Date();
          recordedDate = now.toISOString().split('T')[0];
          recordedTime = '00:00:00';
          createdAtUtc = now.toISOString();
          console.warn(`⚠️ Missing created_at for swing ${swing.blast_id}`);
        }

        // Extract metrics
        const extractMetricValue = (metricKey: string): number | null => {
          const metric = swing.metrics[metricKey];
          if (!metric || !metric.value) return null;
          const parsed = parseFloat(metric.value);
          return isNaN(parsed) ? null : parsed;
        };

        // Insert swing
        const { error: insertError } = await supabase
          .from('blast_swings')
          .insert({
            athlete_id: athlete.id,
            blast_id: swing.blast_id,
            swing_id: swing.id,
            academy_id: swing.academy_id,
            recorded_date: recordedDate,
            recorded_time: recordedTime,
            created_at_utc: createdAtUtc,
            sport_id: swing.sport_id,
            handedness: swing.handedness,
            swing_details: swing.swing_details || null,
            equipment_id: swing.equipment?.id || null,
            equipment_name: swing.equipment?.name || null,
            equipment_nickname: swing.equipment?.nick_name || null,
            has_video: swing.has_video,
            video_id: swing.video_id,
            video_url: null,
            metrics: swing.metrics,
            bat_speed: extractMetricValue('swing_speed'),
            attack_angle: extractMetricValue('bat_path_angle'),
            time_to_contact: extractMetricValue('time_to_contact'),
            peak_hand_speed: extractMetricValue('peak_hand_speed'),
            on_plane_efficiency: extractMetricValue('planar_efficiency'),
            vertical_bat_angle: extractMetricValue('vertical_bat_angle'),
            plane_score: extractMetricValue('plane_score'),
            connection_score: extractMetricValue('connection_score'),
            rotation_score: extractMetricValue('rotation_score'),
            power: extractMetricValue('power'),
            rotational_acceleration: extractMetricValue('rotational_acceleration'),
            connection_at_impact: extractMetricValue('connection'),
            early_connection: extractMetricValue('early_connection'),
          });

        if (insertError) {
          errors.push(`${swing.blast_id}: ${insertError.message}`);
        } else {
          insertedCount++;
          if (insertedCount % 50 === 0) {
            console.log(`   Inserted ${insertedCount}/${allSwings.length} swings...`);
          }
        }
      } catch (error) {
        errors.push(`${swing.blast_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️ Errors:\n   ${errors.slice(0, 5).join('\n   ')}`);
    }

    // Update athlete sync timestamp
    await supabase
      .from('athletes')
      .update({
        blast_synced_at: new Date().toISOString(),
        blast_sync_error: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', athlete.id);

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resyncBlastData();
