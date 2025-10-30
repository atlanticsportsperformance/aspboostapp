// Check max bat speed in database
import { createClient } from '@supabase/supabase-js';

async function checkMaxBatSpeed() {
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
    console.log('\n🔍 Checking max bat speed data...\n');

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

    // Get all swings with bat speed
    const { data: swings } = await supabase
      .from('blast_swings')
      .select('recorded_date, recorded_time, bat_speed')
      .eq('athlete_id', athlete.id)
      .not('bat_speed', 'is', null)
      .order('bat_speed', { ascending: false })
      .limit(20);

    if (!swings || swings.length === 0) {
      console.log('❌ No swings with bat speed found');
      return;
    }

    console.log(`   Athlete: ${athlete.first_name} ${athlete.last_name}`);
    console.log(`   Total swings with bat speed: ${swings.length}\n`);

    console.log('   Top 20 bat speeds:');
    swings.forEach((swing, idx) => {
      console.log(`      ${idx + 1}. ${swing.bat_speed} mph on ${swing.recorded_date} ${swing.recorded_time}`);
    });

    const maxSpeed = swings[0].bat_speed;
    console.log(`\n   ✅ Max bat speed: ${maxSpeed} mph\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMaxBatSpeed();
