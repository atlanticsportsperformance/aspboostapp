// Delete all blast swings directly using Supabase client
import { createClient } from '@supabase/supabase-js';

async function deleteBlastSwings() {
  // Create Supabase client with service role key for admin access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    console.log('\n🗑️ Deleting all Blast swing data...\n');

    // Get athlete ID for Gio Naples (blast_player_id = 506872)
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name')
      .eq('blast_player_id', 506872)
      .single();

    if (athleteError || !athlete) {
      console.error('❌ Could not find athlete with blast_player_id 506872');
      console.error('Error:', athleteError);
      return;
    }

    console.log(`   Athlete: ${athlete.first_name} ${athlete.last_name} (${athlete.id})`);

    // Count swings before deletion
    const { count: beforeCount } = await supabase
      .from('blast_swings')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athlete.id);

    console.log(`   Existing swings: ${beforeCount || 0}`);

    // Delete all swings for this athlete
    const { error: deleteError } = await supabase
      .from('blast_swings')
      .delete()
      .eq('athlete_id', athlete.id);

    if (deleteError) {
      console.error('❌ Error deleting swings:', deleteError);
      return;
    }

    console.log(`   ✅ Deleted ${beforeCount || 0} swings\n`);

    console.log('🔄 Now re-sync the data by visiting the athlete\'s Hitting Profile tab');
    console.log('   and clicking "Sync with Blast Motion (365 days)"\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteBlastSwings();
