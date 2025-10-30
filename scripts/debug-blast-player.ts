// Debug: Check what swings exist for a specific Blast Motion player
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function debugPlayer() {
  const playerId = 506872; // Gio Naples

  const username = process.env.BLAST_MOTION_USERNAME || 'info@atlanticperformancetraining.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'Max3Luke9$';

  const api = createBlastMotionAPI(username, password);

  try {
    console.log(`\n🔍 Debugging Player ID: ${playerId}\n`);

    // Try different date ranges
    const today = new Date().toISOString().split('T')[0];

    const ranges = [
      { label: 'Last 7 days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: today },
      { label: 'Last 30 days', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: today },
      { label: 'Last 90 days', start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: today },
      { label: 'Last 365 days', start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: today },
      { label: 'All time (2 years)', start: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: today },
    ];

    for (const range of ranges) {
      console.log(`\n📅 ${range.label} (${range.start} to ${range.end}):`);

      const swings = await api.getAllPlayerSwings(playerId, {
        dateStart: range.start,
        dateEnd: range.end,
      });

      console.log(`   Found: ${swings.length} swings`);

      if (swings.length > 0) {
        console.log(`\n   ✅ Sample swing:`);
        const swing = swings[0];
        console.log(`      Blast ID: ${swing.blast_id}`);
        console.log(`      Date: ${swing.created_at?.date || 'N/A'}`);
        console.log(`      Time: ${swing.created_at?.time || 'N/A'}`);
        console.log(`      Swing Details: ${swing.swing_details || 'N/A'}`);
        console.log(`      Metrics: ${Object.keys(swing.metrics || {}).length} available`);

        if (swing.metrics) {
          console.log(`\n      Key metrics:`);
          if (swing.metrics.swing_speed) console.log(`         Bat Speed: ${swing.metrics.swing_speed.value} ${swing.metrics.swing_speed.unit}`);
          if (swing.metrics.bat_path_angle) console.log(`         Attack Angle: ${swing.metrics.bat_path_angle.value} ${swing.metrics.bat_path_angle.unit}`);
          if (swing.metrics.plane_score) console.log(`         Plane Score: ${swing.metrics.plane_score.value}`);
        }

        break; // Stop after finding swings
      }
    }

    console.log('\n✅ Debug complete\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

debugPlayer();
