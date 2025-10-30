// Test Blast Motion API with JWT Authentication
// Run with: npx tsx scripts/test-blast-jwt.ts

import { createBlastMotionAPI } from '@/lib/blast-motion/api-jwt';

async function testBlastMotionJWT() {
  console.log('🚀 Testing Blast Motion API with JWT Authentication...\n');

  const username = process.env.BLAST_MOTION_USERNAME || 'info@atlanticperformancetraining.com';
  const password = process.env.BLAST_MOTION_PASSWORD || 'Max3Luke9$';

  console.log('📋 Using credentials:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${'*'.repeat(password.length)}\n`);

  const api = createBlastMotionAPI(username, password);

  try {
    // Test 1: Test Connection (which includes JWT auth)
    console.log('TEST 1: Testing connection with JWT authentication...');
    const connectionResult = await api.testConnection();
    console.log('✅ Connection Result:', JSON.stringify(connectionResult, null, 2));
    console.log('');

    if (!connectionResult.success) {
      console.error('❌ Connection failed. Stopping tests.');
      return;
    }

    // Test 2: Get Team Insights (last year)
    console.log('TEST 2: Fetching team insights (last year)...');
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const dateStart = oneYearAgo.toISOString().split('T')[0];
    const dateEnd = today.toISOString().split('T')[0];

    const teamInsights = await api.getTeamInsights({
      dateStart,
      dateEnd,
      page: 1,
      perPage: 5,
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
        const metrics = Object.entries(samplePlayer.averages).slice(0, 5);
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
          perPage: 3,
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
            const swingMetrics = Object.entries(sampleSwing.metrics).slice(0, 5);
            swingMetrics.forEach(([key, metric]) => {
              console.log(`       - ${metric.display_name}: ${metric.display_value}`);
            });
          }
        }
        console.log('');
      }
    }

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ JWT Authentication: Working`);
    console.log(`   ✅ Team Insights: Working`);
    console.log(`   ✅ Player Metrics: Working`);
    console.log('\n✨ Blast Motion API integration is ready to use!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Deploy database schema (scripts/create-blast-motion-schema.sql)');
    console.log('   2. Build sync API endpoints');
    console.log('   3. Create admin config UI');
    console.log('   4. Build Hitting Profile tab');

  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\n📋 Error Details:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify username/password are correct');
    console.log('   2. Check that you have API access enabled');
    console.log('   3. Ensure the account is an admin/coach account');
    console.log('   4. Contact Blast Motion support if issues persist');
  }
}

testBlastMotionJWT();
