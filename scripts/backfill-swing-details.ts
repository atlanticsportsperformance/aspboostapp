// Backfill Script: Add swing_details from JSONB to swing_details column
// Purpose: Update existing blast_swings records to populate swing_details column
// Run after: add-swing-details-column.sql migration

import { createClient } from '@/lib/supabase/server';

async function backfillSwingDetails() {
  console.log('🔄 Starting swing_details backfill...\n');

  const supabase = await createClient();

  try {
    // Note: This is only needed if you have existing swings without swing_details
    // The sync endpoint will automatically populate this field for new swings

    // For now, this script is a placeholder since swing_details comes from the API
    // and we can't extract it from existing JSONB (it's not in metrics, it's a top-level field)

    console.log('✅ swing_details is now being captured by the sync endpoint.');
    console.log('   New swings will have swing_details automatically populated.');
    console.log('   Existing swings can be re-synced to populate this field.');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillSwingDetails()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
