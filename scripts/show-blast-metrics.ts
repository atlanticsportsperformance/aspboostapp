// Show All Blast Motion Metrics
import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function showMetrics() {
  const username = process.env.BLAST_MOTION_USERNAME || 'info@atlanticperformancetraining.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'Max3Luke9$';

  const api = createBlastMotionAPI(username, password);

  try {
    console.log('🔍 Fetching sample swing to show all metrics...\n');

    // Get a player
    const players = await api.searchPlayer('a');
    if (players.length === 0) {
      console.log('No players found');
      return;
    }

    const player = players[0];
    console.log(`Player: ${player.name}`);
    console.log(`Player ID: ${player.id}\n`);

    // Get one swing (just past 30 days to be quick)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const swings = await api.getAllPlayerSwings(player.id, {
      dateStart: thirtyDaysAgo,
      dateEnd: today,
    });

    if (swings.length === 0) {
      console.log('No swings found');
      return;
    }

    const swing = swings[0];

    // Show full swing object structure first
    console.log('🔍 FULL SWING OBJECT FIELDS:\n');
    console.log('='.repeat(80));
    Object.keys(swing).forEach(key => {
      const value = swing[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`  ${key}: ${type}`);
      if (key === 'swing_details') {
        console.log(`    Value: "${value}"`);
      }
    });
    console.log('='.repeat(80));

    console.log('\n📊 COMPLETE LIST OF METRICS FROM BLAST MOTION:\n');
    console.log('='.repeat(80));

    // Get all metric names
    const metricNames = Object.keys(swing.metrics).sort();

    console.log(`\nTotal Metrics: ${metricNames.length}\n`);

    // Show each metric with details
    metricNames.forEach((key, index) => {
      const metric = swing.metrics[key];
      console.log(`${index + 1}. ${metric.display_name}`);
      console.log(`   Key: "${key}"`);
      console.log(`   Value: ${metric.value} ${metric.unit || ''}`);
      console.log(`   Display: ${metric.display_value} ${metric.display_unit || ''}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n📋 METRIC KEYS (for database columns):\n');
    metricNames.forEach((key) => {
      console.log(`  - ${key}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

showMetrics();
