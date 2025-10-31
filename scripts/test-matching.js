/**
 * Test the matching algorithm directly
 */

const { createClient } = require('@supabase/supabase-js');
const { matchSwingsByTime, groupSwingPairsIntoSessions } = require('../lib/paired-data/matching.ts');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMatching(athleteId) {
  console.log('🔬 Testing Matching Algorithm');
  console.log('═'.repeat(80));
  console.log(`Athlete ID: ${athleteId}\n`);

  // Fetch Blast swings for Oct 30
  const { data: blastSwings } = await supabase
    .from('blast_swings')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('recorded_date', '2025-10-30')
    .order('recorded_time', { ascending: true });

  console.log(`📊 Fetched ${blastSwings?.length || 0} Blast swings on 2025-10-30`);

  // Fetch HitTrax swings for Oct 30
  const { data: hittraxSessions } = await supabase
    .from('hittrax_sessions')
    .select('id')
    .eq('athlete_id', athleteId);

  let hittraxSwings = [];
  if (hittraxSessions && hittraxSessions.length > 0) {
    const { data: swings } = await supabase
      .from('hittrax_swings')
      .select('*')
      .in('session_id', hittraxSessions.map(s => s.id))
      .order('swing_timestamp', { ascending: true });

    hittraxSwings = swings || [];
  }

  console.log(`📊 Fetched ${hittraxSwings.length} HitTrax swings total`);

  // Filter HitTrax swings to Oct 30
  const htxOct30 = hittraxSwings.filter(s => {
    if (!s.swing_timestamp) return false;
    const [datePart] = s.swing_timestamp.split(' ');
    const [month, day, year] = datePart.split('/');
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return date === '2025-10-30';
  });

  console.log(`📊 Filtered to ${htxOct30.length} HitTrax swings on 2025-10-30`);

  if (!blastSwings || blastSwings.length === 0) {
    console.log('❌ No Blast swings found');
    return;
  }

  if (htxOct30.length === 0) {
    console.log('❌ No HitTrax swings found');
    return;
  }

  // Show sample timestamps
  console.log('\n📅 Sample Blast timestamps:');
  blastSwings.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i+1}. ${s.recorded_date} ${s.recorded_time}`);
  });

  console.log('\n📅 Sample HitTrax timestamps:');
  htxOct30.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i+1}. ${s.swing_timestamp}`);
  });

  // Run matching algorithm
  console.log('\n🔗 Running matching algorithm...');
  const swingPairs = matchSwingsByTime(blastSwings, htxOct30, 5);

  const paired = swingPairs.filter(p => p.blastSwing && p.hittraxSwing);
  const blastOnly = swingPairs.filter(p => p.blastSwing && !p.hittraxSwing);
  const htxOnly = swingPairs.filter(p => !p.blastSwing && p.hittraxSwing);

  console.log('\n📈 Results:');
  console.log(`  ✅ Paired swings: ${paired.length}`);
  console.log(`  🔵 Blast only: ${blastOnly.length}`);
  console.log(`  🟣 HitTrax only: ${htxOnly.length}`);
  console.log(`  📊 Total pairs: ${swingPairs.length}`);

  if (paired.length > 0) {
    console.log('\n🎯 Sample paired swings:');
    paired.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i+1}. Blast: ${p.blastSwing.recorded_date} ${p.blastSwing.recorded_time}`);
      console.log(`     HitTrax: ${p.hittraxSwing.swing_timestamp}`);
      console.log(`     Time diff: ${p.timeDifferenceSeconds?.toFixed(2)}s, Confidence: ${(p.confidence * 100).toFixed(0)}%`);
    });
  }

  // Test session grouping
  console.log('\n📦 Testing session grouping...');
  const sessions = groupSwingPairsIntoSessions(swingPairs, athleteId);
  console.log(`  Created ${sessions.length} sessions`);

  sessions.forEach(session => {
    console.log(`\n  Session: ${session.date}`);
    console.log(`    Blast swings: ${session.blastSession?.swingCount || 0}`);
    console.log(`    HitTrax swings: ${session.hittraxSession?.swingCount || 0}`);
    console.log(`    Match confidence: ${(session.matchConfidence * 100).toFixed(0)}%`);
    console.log(`    Match method: ${session.matchMethod}`);
  });

  console.log('\n' + '═'.repeat(80));
}

const athleteId = process.argv[2] || 'edf7a6b8-cd9c-4eb5-bb17-8484b2214910';

testMatching(athleteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
