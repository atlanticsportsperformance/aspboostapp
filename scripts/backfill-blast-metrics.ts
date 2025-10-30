// Backfill Script: Extract Blast Motion Metrics from JSONB to Columns
// Purpose: Update existing blast_swings records to populate new metric columns
// Run after: add-blast-metric-columns.sql migration

import { createClient } from '@/lib/supabase/server';

async function backfillMetrics() {
  console.log('🔄 Starting Blast Motion metrics backfill...\n');

  const supabase = await createClient();

  try {
    // 1. Get total count of swings to backfill
    const { count: totalCount } = await supabase
      .from('blast_swings')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Found ${totalCount} swing records to process\n`);

    if (!totalCount || totalCount === 0) {
      console.log('✅ No swings to backfill. Exiting.');
      return;
    }

    // 2. Process swings in batches
    const BATCH_SIZE = 100;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      console.log(`📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);

      // Fetch batch of swings
      const { data: swings, error: fetchError } = await supabase
        .from('blast_swings')
        .select('id, metrics')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        console.error(`❌ Error fetching batch at offset ${offset}:`, fetchError);
        errorCount += BATCH_SIZE;
        continue;
      }

      if (!swings || swings.length === 0) {
        break;
      }

      // Process each swing in the batch
      for (const swing of swings) {
        try {
          // Extract metric values from JSONB
          const extractMetricValue = (metricKey: string): number | null => {
            const metric = swing.metrics?.[metricKey];
            if (!metric || !metric.value) return null;
            const parsed = parseFloat(metric.value);
            return isNaN(parsed) ? null : parsed;
          };

          // Build update object with ALL 13 extracted metrics
          const updates = {
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
          };

          // Update the swing record
          const { error: updateError } = await supabase
            .from('blast_swings')
            .update(updates)
            .eq('id', swing.id);

          if (updateError) {
            console.error(`❌ Error updating swing ${swing.id}:`, updateError);
            errors.push(`Swing ${swing.id}: ${updateError.message}`);
            errorCount++;
          } else {
            updatedCount++;
          }

          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing swing ${swing.id}:`, error);
          errors.push(`Swing ${swing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
          processedCount++;
        }
      }

      // Progress update
      const progress = ((processedCount / totalCount) * 100).toFixed(1);
      console.log(`   ✓ Processed ${processedCount}/${totalCount} (${progress}%) - Updated: ${updatedCount}, Errors: ${errorCount}`);
    }

    // 3. Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ BACKFILL COMPLETE\n');
    console.log(`Total Swings:    ${totalCount}`);
    console.log(`Processed:       ${processedCount}`);
    console.log(`Updated:         ${updatedCount}`);
    console.log(`Errors:          ${errorCount}`);
    console.log('='.repeat(80));

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((err) => console.log(`   - ${err}`));
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errors encountered (showing first 10):`);
      errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    }

    // 4. Show sample of updated data
    console.log('\n📊 Sample of updated swings:');
    const { data: sampleSwings } = await supabase
      .from('blast_swings')
      .select('id, recorded_date, bat_speed, attack_angle, plane_score, connection_score, rotation_score, power')
      .not('bat_speed', 'is', null)
      .order('recorded_date', { ascending: false })
      .limit(5);

    if (sampleSwings && sampleSwings.length > 0) {
      console.log('\nRecent swings with extracted metrics:');
      sampleSwings.forEach((swing, index) => {
        console.log(`\n${index + 1}. Swing from ${swing.recorded_date}:`);
        console.log(`   Bat Speed:         ${swing.bat_speed || '--'} mph`);
        console.log(`   Attack Angle:      ${swing.attack_angle || '--'}°`);
        console.log(`   Plane Score:       ${swing.plane_score || '--'}`);
        console.log(`   Connection Score:  ${swing.connection_score || '--'}`);
        console.log(`   Rotation Score:    ${swing.rotation_score || '--'}`);
        console.log(`   Power:             ${swing.power || '--'} kW`);
      });
    }

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillMetrics()
  .then(() => {
    console.log('\n✅ Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
