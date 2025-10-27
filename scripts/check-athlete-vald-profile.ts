// Check athlete's VALD profile details
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAthleteValdProfile() {
  const athleteId = process.argv[2];

  if (!athleteId) {
    console.error('❌ Please provide athlete ID as argument');
    console.log('Usage: npx tsx scripts/check-athlete-vald-profile.ts <athlete-id>');
    process.exit(1);
  }

  console.log(`🔍 Checking VALD profile for athlete ${athleteId}\\n`);

  // Get athlete details
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, vald_profile_id, vald_sync_id, vald_synced_at')
    .eq('id', athleteId)
    .single();

  if (athleteError || !athlete) {
    console.error('❌ Athlete not found:', athleteError);
    return;
  }

  console.log('📋 Athlete Details:');
  console.log(`   Name: ${athlete.first_name} ${athlete.last_name}`);
  console.log(`   Email: ${athlete.email || 'Not set'}`);
  console.log(`   VALD Profile ID: ${athlete.vald_profile_id || '❌ NOT SET'}`);
  console.log(`   VALD Sync ID: ${athlete.vald_sync_id || 'Not set'}`);
  console.log(`   Last Synced: ${athlete.vald_synced_at || 'Never'}\\n`);

  // Check for existing tests
  const testTables = [
    { name: 'CMJ', table: 'cmj_tests' },
    { name: 'SJ', table: 'sj_tests' },
    { name: 'HJ', table: 'hj_tests' },
    { name: 'PPU', table: 'ppu_tests' },
    { name: 'IMTP', table: 'imtp_tests' },
  ];

  console.log('📊 Existing Tests in Database:\\n');
  let totalTests = 0;

  for (const { name, table } of testTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId);

    if (!error) {
      console.log(`   ${name}: ${count || 0} test(s)`);
      totalTests += count || 0;
    }
  }

  console.log(`\\n   Total: ${totalTests} test(s)\\n`);

  if (!athlete.vald_profile_id) {
    console.log('⚠️  No VALD profile linked!');
    console.log('   This athlete needs a VALD profile ID to sync tests.');
    console.log('   Check if the athlete was created with VALD linking enabled.');
  }
}

checkAthleteValdProfile().catch(console.error);
