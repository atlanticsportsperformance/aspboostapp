// Clear all blast_swings data for fresh re-sync
import { createClient } from '@supabase/supabase-js';

async function clearBlastSwings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    console.log('\n🗑️  Clearing all blast_swings data...\n');

    // Count total swings before deletion
    const { count: beforeCount, error: countError } = await supabase
      .from('blast_swings')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting swings:', countError);
      return;
    }

    console.log(`   Total swings before deletion: ${beforeCount || 0}`);

    // Delete all swings (this will work across all partitions)
    const { error: deleteError } = await supabase
      .from('blast_swings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (UUID that doesn't exist)

    if (deleteError) {
      console.error('❌ Error deleting swings:', deleteError);
      return;
    }

    // Verify deletion
    const { count: afterCount } = await supabase
      .from('blast_swings')
      .select('id', { count: 'exact', head: true });

    console.log(`   Total swings after deletion: ${afterCount || 0}`);
    console.log(`   ✅ Deleted ${beforeCount || 0} swings\n`);

    console.log('🔄 Ready to re-sync data!');
    console.log('   Use the "Sync with Blast Motion (365 days)" button in the UI\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearBlastSwings();
