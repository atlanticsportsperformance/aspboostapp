// Verify that Blast swings now have correct dates
import { createClient } from '@supabase/supabase-js';

async function verifyBlastDates() {
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
    console.log('\n✅ Verifying Blast swing dates...\n');

    // Get athlete
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, first_name, last_name')
      .eq('blast_player_id', 506872)
      .single();

    if (!athlete) {
      console.error('❌ Athlete not found');
      return;
    }

    // Get unique dates
    const { data: swings } = await supabase
      .from('blast_swings')
      .select('recorded_date, recorded_time')
      .eq('athlete_id', athlete.id)
      .order('recorded_date', { ascending: false })
      .order('recorded_time', { ascending: false });

    if (!swings || swings.length === 0) {
      console.log('❌ No swings found');
      return;
    }

    console.log(`   Total swings: ${swings.length}`);

    // Get unique dates
    const uniqueDates = [...new Set(swings.map(s => s.recorded_date))].sort().reverse();
    console.log(`   Unique dates: ${uniqueDates.length}\n`);

    // Show first 10 dates
    console.log('   Recent dates:');
    uniqueDates.slice(0, 10).forEach(date => {
      const count = swings.filter(s => s.recorded_date === date).length;
      console.log(`      ${date}: ${count} swings`);
    });

    // Show oldest dates
    console.log('\n   Oldest dates:');
    uniqueDates.slice(-5).reverse().forEach(date => {
      const count = swings.filter(s => s.recorded_date === date).length;
      console.log(`      ${date}: ${count} swings`);
    });

    // Show sample times
    console.log('\n   Sample times on most recent date:');
    const recentDate = uniqueDates[0];
    const recentSwings = swings.filter(s => s.recorded_date === recentDate).slice(0, 5);
    recentSwings.forEach(s => {
      console.log(`      ${s.recorded_date} ${s.recorded_time}`);
    });

    console.log('\n✅ Dates look correct!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyBlastDates();
