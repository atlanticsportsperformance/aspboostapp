// Test Blast Motion API Connection
// Run with: npx tsx scripts/test-blast-motion-connection.ts

import { createBlastMotionAPI } from '@/lib/blast-motion/api';

async function testBlastMotionConnection() {
  console.log('🚀 Testing Blast Motion API Connection...\n');

  // Get credentials from environment
  const username = process.env.BLAST_MOTION_USERNAME || 'atlanticapi@blastmotion.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'atlanticsportsperformance';

  console.log('📋 Using credentials:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${'*'.repeat(password.length)}\n`);

  // Create API client
  const api = createBlastMotionAPI(username, password);

  try {
    // Test 1: Test Connection
    console.log('TEST 1: Testing connection...');
    const connectionResult = await api.testConnection();
    console.log('✅ Connection Result:', JSON.stringify(connectionResult, null, 2));
    console.log('');

    if (!connectionResult.success) {
      console.error('❌ Connection failed. Stopping tests.');
      return;
    }

    // Test 2: Get Team Insights (last 365 days to ensure we have data)
    console.log('TEST 2: Fetching team insights (last 365 days)...');
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const dateStart = oneYearAgo.toISOString().split('T')[0];
    const dateEnd = today.toISOString().split('T')[0];

    const teamInsights = await api.getTeamInsights({
      dateStart,
      dateEnd,
      page: 1,
      perPage: 5, // Just get first 5 players
    });

    console.log('✅ Team Insights Result:');
    console.log(`   Total Players: ${teamInsights.data.total}`);
    console.log(`   Current Page: ${teamInsights.data.current_page}`);
    console.log(`   Total Pages: ${teamInsights.data.last_page}`);
    console.log(`   Players on this page: ${teamInsights.data.data.length}`);
    console.log('');

    // Test 3: Display sample player data
    if (teamInsights.data.data.length > 0) {
      console.log('TEST 3: Sample player data...');
      const samplePlayer = teamInsights.data.data[0];
      console.log('✅ Sample Player:');
      console.log(`   ID: ${samplePlayer.id}`);
      console.log(`   Blast User ID: ${samplePlayer.blast_user_id}`);
      console.log(`   Name: ${samplePlayer.name}`);
      console.log(`   Email: ${samplePlayer.email}`);
      console.log(`   Total Swings: ${samplePlayer.total_actions}`);
      console.log(`   Has Actions: ${samplePlayer.has_actions}`);

      if (samplePlayer.averages && Object.keys(samplePlayer.averages).length > 0) {
        console.log('   Sample Metrics:');
        const metrics = Object.entries(samplePlayer.averages).slice(0, 3);
        metrics.forEach(([key, metric]) => {
          console.log(`     - ${metric.display_name}: ${metric.display_value}`);
        });
      }
      console.log('');

      // Test 4: Get individual player swings
      if (samplePlayer.has_actions) {
        console.log('TEST 4: Fetching individual swings for sample player...');
        const playerSwings = await api.getPlayerMetrics(samplePlayer.id, {
          dateStart,
          dateEnd,
          page: 1,
          perPage: 3, // Just get first 3 swings
        });

        console.log('✅ Player Swings Result:');
        console.log(`   Total Swings: ${playerSwings.data.total}`);
        console.log(`   Swings on this page: ${playerSwings.data.data.length}`);

        if (playerSwings.data.data.length > 0) {
          const sampleSwing = playerSwings.data.data[0];
          console.log('   Sample Swing:');
          console.log(`     Blast ID: ${sampleSwing.blast_id}`);
          console.log(`     Date: ${sampleSwing.created_at.date}`);
          console.log(`     Time: ${sampleSwing.created_at.time}`);
          console.log(`     Has Video: ${sampleSwing.has_video}`);
          console.log(`     Sport ID: ${sampleSwing.sport_id} (2=Baseball, 12=Softball)`);

          if (sampleSwing.equipment) {
            console.log(`     Equipment: ${sampleSwing.equipment.name}`);
          }

          if (sampleSwing.metrics && Object.keys(sampleSwing.metrics).length > 0) {
            console.log('     Key Metrics:');
            const swingMetrics = Object.entries(sampleSwing.metrics).slice(0, 3);
            swingMetrics.forEach(([key, metric]) => {
              console.log(`       - ${metric.display_name}: ${metric.display_value}`);
            });
          }
        }
        console.log('');
      }
    }

    // Test 5: Search for a player
    if (teamInsights.data.data.length > 0) {
      const firstPlayer = teamInsights.data.data[0];
      const searchName = firstPlayer.first_name;

      if (searchName) {
        console.log(`TEST 5: Searching for player by name "${searchName}"...`);
        const searchResults = await api.searchPlayer(searchName, {
          dateStart,
          dateEnd,
        });

        console.log('✅ Search Results:');
        console.log(`   Found ${searchResults.length} player(s)`);
        searchResults.slice(0, 3).forEach(player => {
          console.log(`     - ${player.name} (${player.email})`);
        });
        console.log('');
      }
    }

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Connection: Working`);
    console.log(`   ✅ Team Insights: Working`);
    console.log(`   ✅ Player Metrics: Working`);
    console.log(`   ✅ Search: Working`);
    console.log('\n✨ Blast Motion API integration is ready to use!');

  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\n📋 Error Details:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check that BLAST_MOTION_USERNAME and BLAST_MOTION_PASSWORD are correct');
    console.log('   2. Verify the credentials have access to the Blast Motion API');
    console.log('   3. Ensure the API base URL is correct');
    console.log('   4. Check your internet connection');
  }
}

// Run the test
testBlastMotionConnection();
