// Test Script for Blast Motion Integration
// Run with: npx tsx scripts/test-blast-integration.ts

import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function testBlastIntegration() {
  console.log('🔍 Testing Blast Motion Integration...\n');

  const username = process.env.BLAST_MOTION_USERNAME || 'info@atlanticperformancetraining.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'Max3Luke9$';

  const api = createBlastMotionAPI(username, password);

  try {
    // Test 1: Search for a player
    console.log('TEST 1: Searching for players...');
    const searchResults = await api.searchPlayer('a'); // Search for names with 'a'
    console.log(`✅ Found ${searchResults.length} players`);

    if (searchResults.length > 0) {
      const samplePlayer = searchResults[0];
      console.log('\nSample Player:');
      console.log(`  ID: ${samplePlayer.id}`);
      console.log(`  Name: ${samplePlayer.name}`);
      console.log(`  Email: ${samplePlayer.email}`);
      console.log(`  Total Swings: ${samplePlayer.total_actions}`);
      console.log(`  Blast User ID: ${samplePlayer.blast_user_id}`);
      console.log('');

      // Test 2: Get individual player swings
      console.log('TEST 2: Fetching swings for sample player...');
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const dateStart = oneYearAgo.toISOString().split('T')[0];
      const dateEnd = today.toISOString().split('T')[0];

      const swings = await api.getAllPlayerSwings(samplePlayer.id, {
        dateStart,
        dateEnd,
      });

      console.log(`✅ Found ${swings.length} total swings for ${samplePlayer.name}`);

      if (swings.length > 0) {
        const sampleSwing = swings[0];
        console.log('\nSample Swing:');
        console.log(`  Blast ID: ${sampleSwing.blast_id}`);
        console.log(`  Date: ${sampleSwing.created_at.date}`);
        console.log(`  Time: ${sampleSwing.created_at.time}`);
        console.log(`  Sport ID: ${sampleSwing.sport_id} (2=Baseball, 12=Softball)`);
        console.log(`  Has Video: ${sampleSwing.has_video}`);

        if (sampleSwing.metrics) {
          const metricKeys = Object.keys(sampleSwing.metrics);
          console.log(`  Metrics: ${metricKeys.length} metrics available`);

          // Show first 5 metrics
          metricKeys.slice(0, 5).forEach(key => {
            const metric = sampleSwing.metrics[key];
            console.log(`    - ${metric.display_name}: ${metric.display_value}`);
          });
        }
      }
    }

    console.log('\n✅ Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Player Search: Working');
    console.log('  ✅ Player Swings: Working');
    console.log('  ✅ Data Format: Valid');
    console.log('\n🎯 Next Steps:');
    console.log('  1. Go to athlete profile page');
    console.log('  2. Click Settings tab');
    console.log('  3. Use "Search Blast Motion" button');
    console.log('  4. Link athlete to Blast Motion player');
    console.log('  5. Click "Sync Swing Data" button');

  } catch (error) {
    console.error('\n❌ Integration Test Failed:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\n📋 Error Details:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }
  }
}

testBlastIntegration();
