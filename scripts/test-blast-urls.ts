// Test Blast Motion API with different base URLs
// Run with: npx tsx scripts/test-blast-urls.ts

import { createBlastMotionAPI } from '@/lib/blast-motion/api';

const BASE_URLS = [
  'https://connect.blastmotion.com',
  'https://api.blastconnect.com',
  'https://blastconnect.com',
  'https://api.blastmotion.com',
  'https://blastmotion.com',
];

async function testMultipleUrls() {
  console.log('🚀 Testing Blast Motion API with multiple base URLs...\n');

  const username = 'atlanticapi@blastmotion.com';
  const password = 'atlanticsportsperformance';

  console.log('📋 Using credentials:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${'*'.repeat(password.length)}\n`);

  // Use a date range that should have data
  const dateEnd = new Date().toISOString().split('T')[0];
  const dateStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`📅 Date range: ${dateStart} to ${dateEnd}\n`);

  for (const baseUrl of BASE_URLS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🌐 Testing: ${baseUrl}`);
    console.log('='.repeat(70));

    try {
      const api = createBlastMotionAPI(username, password, baseUrl);

      const response = await api.getTeamInsights({
        dateStart,
        dateEnd,
        page: 1,
        perPage: 1,
      });

      console.log('✅ SUCCESS!');
      console.log(`   Total players: ${response.data.total}`);
      console.log(`   Players on page: ${response.data.data.length}`);

      if (response.data.data.length > 0) {
        const player = response.data.data[0];
        console.log(`   Sample player: ${player.name} (${player.email})`);
        console.log(`   Total swings: ${player.total_actions}`);
      }

      console.log(`\n🎉 FOUND WORKING URL: ${baseUrl}`);
      break; // Stop on first success

    } catch (error) {
      console.log('❌ FAILED');
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Testing complete');
}

testMultipleUrls().catch(console.error);
