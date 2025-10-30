// Check all available fields in Blast Motion API response
import { blastApiClient } from '@/lib/blast-motion';

async function checkBlastFields() {
  try {
    const client = await blastApiClient();

    // Search for a player to get their ID
    const players = await client.searchPlayers('evan');
    if (!players || players.length === 0) {
      console.log('No players found');
      return;
    }

    const playerId = players[0].id;
    console.log(`Found player: ${players[0].first_name} ${players[0].last_name} (ID: ${playerId})\n`);

    // Get swings
    const dateEnd = new Date().toISOString().split('T')[0];
    const dateStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const swings = await client.getPlayerSwings(playerId, dateStart, dateEnd);

    if (!swings || swings.length === 0) {
      console.log('No swings found');
      return;
    }

    console.log(`\n📊 FULL SWING OBJECT STRUCTURE (First Swing):\n`);
    console.log(JSON.stringify(swings[0], null, 2));

    console.log('\n\n📋 TOP-LEVEL FIELDS:\n');
    Object.keys(swings[0]).forEach(key => {
      const value = swings[0][key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`  ${key}: ${type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkBlastFields();
