/**
 * Fix recorded_date and recorded_time in blast_swings table
 *
 * Currently these fields are stored in UTC. This script converts them to local time
 * to match the format that will be used for new syncs.
 *
 * Run with: node -r dotenv/config scripts/fix-blast-recorded-times.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBlastRecordedTimes() {
  console.log('🔧 Fixing Blast recorded_date and recorded_time fields');
  console.log('═'.repeat(80));

  // Fetch all blast swings (in batches to avoid memory issues)
  let offset = 0;
  const batchSize = 1000;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\nFetching batch starting at offset ${offset}...`);

    const { data: swings, error } = await supabase
      .from('blast_swings')
      .select('id, created_at_utc, recorded_date, recorded_time')
      .range(offset, offset + batchSize - 1)
      .order('created_at_utc', { ascending: true });

    if (error) {
      console.error('Error fetching swings:', error);
      break;
    }

    if (!swings || swings.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing ${swings.length} swings...`);

    // Update each swing
    const updates = [];
    for (const swing of swings) {
      if (!swing.created_at_utc) {
        console.warn(`Skipping swing ${swing.id} - no created_at_utc`);
        continue;
      }

      // Convert UTC to local time
      const localDate = new Date(swing.created_at_utc);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const hours = String(localDate.getHours()).padStart(2, '0');
      const minutes = String(localDate.getMinutes()).padStart(2, '0');
      const seconds = String(localDate.getSeconds()).padStart(2, '0');

      const newRecordedDate = `${year}-${month}-${day}`;
      const newRecordedTime = `${hours}:${minutes}:${seconds}`;

      // Only update if different
      if (swing.recorded_date !== newRecordedDate || swing.recorded_time !== newRecordedTime) {
        updates.push({
          id: swing.id,
          recorded_date: newRecordedDate,
          recorded_time: newRecordedTime,
        });
      }
    }

    if (updates.length > 0) {
      console.log(`Updating ${updates.length} swings...`);

      // Update in batches
      for (let i = 0; i < updates.length; i += 100) {
        const batch = updates.slice(i, i + 100);

        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('blast_swings')
            .update({
              recorded_date: update.recorded_date,
              recorded_time: update.recorded_time,
            })
            .eq('id', update.id);

          if (updateError) {
            console.error(`Error updating swing ${update.id}:`, updateError);
          }
        }

        totalUpdated += batch.length;
        console.log(`  Updated ${totalUpdated} swings so far...`);
      }
    } else {
      console.log('No updates needed for this batch');
    }

    offset += batchSize;

    // Don't continue if we got fewer than batchSize results
    if (swings.length < batchSize) {
      hasMore = false;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`✅ Complete! Updated ${totalUpdated} swing records`);
  console.log('═'.repeat(80));
}

fixBlastRecordedTimes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
