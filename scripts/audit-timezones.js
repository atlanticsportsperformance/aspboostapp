/**
 * Audit timezone handling across Blast and HitTrax data
 *
 * Run with: node -r dotenv/config scripts/audit-timezones.js <athlete-id>
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditTimezones(athleteId) {
  console.log('🕐 TIMEZONE AUDIT');
  console.log('═'.repeat(80));
  console.log(`Athlete ID: ${athleteId}`);
  console.log(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`Current server time: ${new Date().toString()}`);
  console.log('═'.repeat(80));

  // Get one Blast swing
  const { data: blastSwing } = await supabase
    .from('blast_swings')
    .select('*')
    .eq('athlete_id', athleteId)
    .limit(1)
    .single();

  if (blastSwing) {
    console.log('\n📊 BLAST SWING ANALYSIS:');
    console.log('─'.repeat(80));
    console.log('Raw data from database:');
    console.log(`  recorded_date: "${blastSwing.recorded_date}"`);
    console.log(`  recorded_time: "${blastSwing.recorded_time}"`);

    console.log('\nParsing interpretations:');

    // Method 1: Without timezone (treats as local)
    const localParse = new Date(`${blastSwing.recorded_date}T${blastSwing.recorded_time}`);
    console.log(`  1. As local time: ${localParse.toString()}`);
    console.log(`     ISO: ${localParse.toISOString()}`);
    console.log(`     Date only: ${localParse.toISOString().split('T')[0]}`);

    // Method 2: With EST (-05:00)
    const estParse = new Date(`${blastSwing.recorded_date}T${blastSwing.recorded_time}-05:00`);
    console.log(`  2. As EST (UTC-5): ${estParse.toString()}`);
    console.log(`     ISO: ${estParse.toISOString()}`);
    console.log(`     Date only: ${estParse.toISOString().split('T')[0]}`);

    // Method 3: With EDT (-04:00)
    const edtParse = new Date(`${blastSwing.recorded_date}T${blastSwing.recorded_time}-04:00`);
    console.log(`  3. As EDT (UTC-4): ${edtParse.toString()}`);
    console.log(`     ISO: ${edtParse.toISOString()}`);
    console.log(`     Date only: ${edtParse.toISOString().split('T')[0]}`);

    console.log('\n⚠️  ISSUE FOUND:');
    if (localParse.toISOString().split('T')[0] !== blastSwing.recorded_date) {
      console.log(`  The date changes when parsing! "${blastSwing.recorded_date}" becomes "${localParse.toISOString().split('T')[0]}"`);
      console.log(`  This happens when parsing without timezone in UTC environment`);
    }
  }

  // Get one HitTrax swing
  const { data: htxSessions } = await supabase
    .from('hittrax_sessions')
    .select('id')
    .eq('athlete_id', athleteId)
    .limit(1);

  if (htxSessions && htxSessions.length > 0) {
    const { data: htxSwing } = await supabase
      .from('hittrax_swings')
      .select('*')
      .eq('session_id', htxSessions[0].id)
      .limit(1)
      .single();

    if (htxSwing) {
      console.log('\n📊 HITTRAX SWING ANALYSIS:');
      console.log('─'.repeat(80));
      console.log('Raw data from database:');
      console.log(`  swing_timestamp: "${htxSwing.swing_timestamp}"`);

      console.log('\nParsing interpretations:');

      // Parse HitTrax timestamp
      const [datePart, timePart] = htxSwing.swing_timestamp.split(' ');
      const [month, day, year] = datePart.split('/');

      // Method 1: Without timezone
      const htxLocal = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        ...timePart.split(':').map(parseFloat)
      );
      console.log(`  1. As local time: ${htxLocal.toString()}`);
      console.log(`     ISO: ${htxLocal.toISOString()}`);
      console.log(`     Date only: ${htxLocal.toISOString().split('T')[0]}`);

      // Method 2: With EST
      const dateStrEST = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}-05:00`;
      const htxEST = new Date(dateStrEST);
      console.log(`  2. As EST (UTC-5): ${htxEST.toString()}`);
      console.log(`     ISO: ${htxEST.toISOString()}`);
      console.log(`     Date only: ${htxEST.toISOString().split('T')[0]}`);

      // Method 3: With EDT
      const dateStrEDT = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}-04:00`;
      const htxEDT = new Date(dateStrEDT);
      console.log(`  3. As EDT (UTC-4): ${htxEDT.toString()}`);
      console.log(`     ISO: ${htxEDT.toISOString()}`);
      console.log(`     Date only: ${htxEDT.toISOString().split('T')[0]}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('💡 RECOMMENDATION:');
  console.log('─'.repeat(80));
  console.log('Since your data shows dates like "2025-10-29", timestamps are in Eastern Time.');
  console.log('We should parse WITHOUT timezone offset to preserve the date as-is.');
  console.log('The server (likely UTC) should NOT shift the date when parsing.');
  console.log('═'.repeat(80));
}

const athleteId = process.argv[2];
if (!athleteId) {
  console.error('Usage: node -r dotenv/config scripts/audit-timezones.js <athlete-id>');
  process.exit(1);
}

auditTimezones(athleteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
