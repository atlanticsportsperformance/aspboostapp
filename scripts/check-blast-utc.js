/**
 * Check Blast UTC timestamps vs recorded time
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBlastUTC(athleteId) {
  console.log('🔍 Checking Blast UTC Timestamps');
  console.log('═'.repeat(80));

  const { data } = await supabase
    .from('blast_swings')
    .select('recorded_date, recorded_time, created_at_utc')
    .eq('athlete_id', athleteId)
    .eq('recorded_date', '2025-10-30')
    .order('recorded_time', { ascending: true })
    .limit(10);

  console.log('\nSample Blast swings:\n');
  data?.forEach((s, i) => {
    const utc = new Date(s.created_at_utc);

    // Get UTC time components
    const utcHours = utc.getUTCHours();
    const utcMinutes = utc.getUTCMinutes();
    const utcSeconds = utc.getUTCSeconds();
    const utcTimeStr = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;

    console.log(`${i+1}. recorded_time: ${s.recorded_time}`);
    console.log(`   created_at_utc: ${s.created_at_utc}`);
    console.log(`   UTC time: ${utcTimeStr}`);

    // Calculate what Eastern time would be (UTC-4 for EDT or UTC-5 for EST)
    // Oct 30 would be EDT (UTC-4)
    const edtHours = (utcHours - 4 + 24) % 24;
    const edtTimeStr = `${String(edtHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;
    console.log(`   EDT time (UTC-4): ${edtTimeStr}`);
    console.log();
  });

  // Get a HitTrax swing for comparison
  const { data: sessions } = await supabase
    .from('hittrax_sessions')
    .select('id')
    .eq('athlete_id', athleteId)
    .limit(1);

  if (sessions && sessions.length > 0) {
    const { data: htxSwings } = await supabase
      .from('hittrax_swings')
      .select('swing_timestamp')
      .eq('session_id', sessions[0].id)
      .order('swing_timestamp', { ascending: true })
      .limit(5);

    console.log('\nHitTrax swings for comparison:');
    console.log('─'.repeat(80));
    htxSwings?.forEach((s, i) => {
      console.log(`${i+1}. ${s.swing_timestamp}`);
    });
  }

  console.log('\n' + '═'.repeat(80));
}

const athleteId = process.argv[2] || 'edf7a6b8-cd9c-4eb5-bb17-8484b2214910';

checkBlastUTC(athleteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
