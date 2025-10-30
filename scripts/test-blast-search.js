const { createBlastMotionAPI } = require('../lib/blast-motion/api.ts');
require('dotenv').config({ path: '.env.local' });

const username = process.env.BLAST_MOTION_USERNAME;
const password = process.env.BLAST_MOTION_PASSWORD;

async function testSearch() {
  console.log('Testing Blast Motion Search...\n');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password ? '***' : 'NOT SET'}\n`);

  if (!username || !password) {
    console.error('❌ Credentials not found in .env.local');
    return;
  }

  try {
    const api = createBlastMotionAPI(username, password);

    console.log('Searching for "chris stracco"...\n');
    const results = await api.searchPlayer('chris stracco');

    console.log(`Found ${results.length} player(s):\n`);
    results.forEach((player, i) => {
      console.log(`Player ${i + 1}:`);
      console.log(`  Name: ${player.name}`);
      console.log(`  Email: ${player.email}`);
      console.log(`  Blast User ID: ${player.blast_user_id}`);
      console.log(`  Position: ${player.position || 'N/A'}`);
      console.log(`  Total Actions: ${player.total_actions}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSearch();
