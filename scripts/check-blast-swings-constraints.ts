// Check blast_swings table for unique constraints
import { createClient } from '@supabase/supabase-js';

async function checkConstraints() {
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
    console.log('\n🔍 Checking blast_swings table constraints...\n');

    // Query all swings to check for duplicates
    const { data: allSwings, error } = await supabase
      .from('blast_swings')
      .select('athlete_id, blast_id');

    if (!allSwings) {
      console.log('✅ No swings found in database\n');
      return;
    }

    // Group by athlete_id and blast_id
    const grouped = allSwings.reduce((acc, row) => {
      const key = `${row.athlete_id}_${row.blast_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find duplicates
    const duplicates = Object.entries(grouped)
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => {
        const [athlete_id, blast_id] = key.split('_');
        return { athlete_id, blast_id, count };
      });

    if (error) {
      console.error('❌ Error checking duplicates:', error);
      return;
    }

    if (duplicates && duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate blast_id entries:\n`);
      duplicates.slice(0, 10).forEach((dup: any) => {
        console.log(`   Athlete: ${dup.athlete_id}, Blast ID: ${dup.blast_id}, Count: ${dup.count}`);
      });
      console.log('\n⚠️ WARNING: Duplicates detected! Database needs unique constraint.\n');
    } else {
      console.log('✅ No duplicates found - data is clean!\n');
    }

    // Check total swings
    const { count } = await supabase
      .from('blast_swings')
      .select('id', { count: 'exact', head: true });

    console.log(`   Total swings in database: ${count}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkConstraints();
