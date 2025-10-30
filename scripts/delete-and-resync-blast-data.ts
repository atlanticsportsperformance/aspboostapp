// Delete all existing Blast swing data and re-sync with correct dates
import { createServiceRoleClient } from '@/lib/supabase/server';

async function deleteAndResyncBlastData() {
  const supabase = createServiceRoleClient();

  try {
    console.log('\n🗑️ Deleting all existing Blast swing data...\n');

    // Get athlete ID for Gio Naples
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name')
      .eq('blast_player_id', 506872)
      .single();

    if (athleteError || !athlete) {
      console.error('❌ Could not find athlete with blast_player_id 506872');
      return;
    }

    console.log(`   Athlete: ${athlete.first_name} ${athlete.last_name} (${athlete.id})`);

    // Delete all swings for this athlete
    const { data: deletedSwings, error: deleteError } = await supabase
      .from('blast_swings')
      .delete()
      .eq('athlete_id', athlete.id)
      .select('id');

    if (deleteError) {
      console.error('❌ Error deleting swings:', deleteError);
      return;
    }

    console.log(`   ✅ Deleted ${deletedSwings?.length || 0} swings\n`);

    console.log('🔄 Now trigger a re-sync via the API route:');
    console.log(`   POST http://localhost:3000/api/athletes/${athlete.id}/blast/sync`);
    console.log('   Body: { "daysBack": 365 }\n');
    console.log('   Or use the "Sync with Blast Motion" button in the UI\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteAndResyncBlastData();
