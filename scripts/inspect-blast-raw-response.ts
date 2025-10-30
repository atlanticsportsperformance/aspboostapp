// Inspect raw Blast Motion API response to see actual field structure
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function inspectRawResponse() {
  const playerId = 506872; // Gio Naples

  const username = process.env.BLAST_MOTION_USERNAME || 'info@atlanticperformancetraining.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'Max3Luke9$';

  const api = createBlastMotionAPI(username, password);

  try {
    console.log(`\n🔍 Fetching swings to inspect raw structure...\n`);

    const today = new Date().toISOString().split('T')[0];
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const swings = await api.getAllPlayerSwings(playerId, {
      dateStart: last7Days,
      dateEnd: today,
    });

    if (swings.length === 0) {
      console.log('❌ No swings found');
      return;
    }

    const swing = swings[0];

    console.log('='.repeat(80));
    console.log('RAW SWING OBJECT STRUCTURE');
    console.log('='.repeat(80));
    console.log(JSON.stringify(swing, null, 2));
    console.log('='.repeat(80));

    console.log('\n📋 TOP-LEVEL FIELDS:');
    console.log(Object.keys(swing).join(', '));

    console.log('\n📋 created_at field:');
    console.log('Type:', typeof swing.created_at);
    console.log('Value:', swing.created_at);

    if (swing.created_at) {
      console.log('Keys:', Object.keys(swing.created_at));
      console.log('created_at.date:', swing.created_at.date);
      console.log('created_at.time:', swing.created_at.time);
    }

    // Look for any date-related fields
    console.log('\n📅 ALL FIELDS CONTAINING "date" or "time" or "created":');
    const allKeys = Object.keys(swing);
    allKeys.forEach(key => {
      if (key.toLowerCase().includes('date') ||
          key.toLowerCase().includes('time') ||
          key.toLowerCase().includes('created')) {
        console.log(`  ${key}:`, (swing as any)[key]);
      }
    });

    console.log('\n✅ Inspection complete\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

inspectRawResponse();
