/**
 * Analyze why some swings aren't pairing
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzePairingIssues(athleteId) {
  console.log('🔍 Analyzing Pairing Issues');
  console.log('═'.repeat(80));

  // Fetch all swings for Oct 30
  const { data: blastSwings } = await supabase
    .from('blast_swings')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('recorded_date', '2025-10-30')
    .order('recorded_time', { ascending: true });

  const { data: sessions } = await supabase
    .from('hittrax_sessions')
    .select('id')
    .eq('athlete_id', athleteId);

  const { data: htxSwings } = await supabase
    .from('hittrax_swings')
    .select('*')
    .in('session_id', sessions.map(s => s.id))
    .order('swing_timestamp', { ascending: true });

  // Filter HitTrax to Oct 30
  const htxOct30 = htxSwings.filter(s => s.swing_timestamp.startsWith('10/30/2025'));

  console.log(`\n📊 Data Summary:`);
  console.log(`  Blast swings: ${blastSwings.length}`);
  console.log(`  HitTrax swings: ${htxOct30.length}`);
  console.log();

  // Analyze time gaps
  console.log('⏱️  Time Gap Analysis:');
  console.log('─'.repeat(80));

  // Parse all timestamps
  const blastTimes = blastSwings.map(s => ({
    id: s.id,
    time: new Date(`2025-10-30T${s.recorded_time}`),
    timeStr: s.recorded_time
  }));

  const htxTimes = htxOct30.map(s => {
    const [datePart, timePart] = s.swing_timestamp.split(' ');
    const [month, day, year] = datePart.split('/');
    return {
      id: s.id,
      time: new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                     ...timePart.split(':').map(parseFloat)),
      timeStr: timePart.split('.')[0]
    };
  });

  // For each Blast swing, find closest HitTrax
  const unmatchedBlast = [];
  const timeGaps = [];

  blastTimes.forEach(blast => {
    let minGap = Infinity;
    let closestHtx = null;

    htxTimes.forEach(htx => {
      const gap = Math.abs(blast.time - htx.time) / 1000; // seconds
      if (gap < minGap) {
        minGap = gap;
        closestHtx = htx;
      }
    });

    timeGaps.push({
      blastTime: blast.timeStr,
      htxTime: closestHtx?.timeStr || 'none',
      gap: minGap
    });

    if (minGap > 5) {
      unmatchedBlast.push({
        time: blast.timeStr,
        closestGap: minGap.toFixed(1)
      });
    }
  });

  // Show gap distribution
  const within1s = timeGaps.filter(g => g.gap <= 1).length;
  const within3s = timeGaps.filter(g => g.gap > 1 && g.gap <= 3).length;
  const within5s = timeGaps.filter(g => g.gap > 3 && g.gap <= 5).length;
  const within10s = timeGaps.filter(g => g.gap > 5 && g.gap <= 10).length;
  const beyond10s = timeGaps.filter(g => g.gap > 10).length;

  console.log('Gap Distribution:');
  console.log(`  ≤ 1 second:  ${within1s} swings (EXCELLENT)`);
  console.log(`  1-3 seconds: ${within3s} swings (GOOD)`);
  console.log(`  3-5 seconds: ${within5s} swings (FAIR - current threshold)`);
  console.log(`  5-10 seconds: ${within10s} swings (would match with higher threshold)`);
  console.log(`  > 10 seconds: ${beyond10s} swings (unlikely to be same swing)`);

  console.log('\n📅 Time Range Analysis:');
  console.log('─'.repeat(80));
  const blastStart = blastTimes[0];
  const blastEnd = blastTimes[blastTimes.length - 1];
  const htxStart = htxTimes[0];
  const htxEnd = htxTimes[htxTimes.length - 1];

  console.log(`Blast session: ${blastStart.timeStr} - ${blastEnd.timeStr}`);
  console.log(`HitTrax session: ${htxStart.timeStr} - ${htxEnd.timeStr}`);

  const blastDuration = (blastEnd.time - blastStart.time) / 1000 / 60;
  const htxDuration = (htxEnd.time - htxStart.time) / 1000 / 60;
  console.log(`\nBlast duration: ${blastDuration.toFixed(1)} minutes`);
  console.log(`HitTrax duration: ${htxDuration.toFixed(1)} minutes`);

  // Check for temporal overlap
  const overlapStart = Math.max(blastStart.time, htxStart.time);
  const overlapEnd = Math.min(blastEnd.time, htxEnd.time);
  const overlapDuration = (overlapEnd - overlapStart) / 1000 / 60;

  if (overlapDuration > 0) {
    console.log(`\nTemporal overlap: ${overlapDuration.toFixed(1)} minutes`);
  } else {
    console.log(`\n⚠️  NO TEMPORAL OVERLAP! Sessions are at different times.`);
  }

  // Show unmatched swings
  if (unmatchedBlast.length > 0) {
    console.log(`\n❌ Unmatched Blast Swings (${unmatchedBlast.length}):`);
    console.log('─'.repeat(80));
    unmatchedBlast.slice(0, 10).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.time} - closest HitTrax is ${s.closestGap}s away`);
    });
    if (unmatchedBlast.length > 10) {
      console.log(`  ... and ${unmatchedBlast.length - 10} more`);
    }
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('═'.repeat(80));

  if (within10s > 0) {
    console.log(`\n1. INCREASE TIME WINDOW TO 10 SECONDS`);
    console.log(`   Current: ${within1s + within3s + within5s} paired swings (5s threshold)`);
    console.log(`   With 10s: ${within1s + within3s + within5s + within10s} paired swings (+${within10s} swings)`);
    console.log(`   Improvement: ${((within10s / blastSwings.length) * 100).toFixed(1)}% more matches`);
  }

  const htxMisses = htxOct30.filter(s =>
    !s.exit_velocity || s.exit_velocity < 10
  ).length;

  if (htxMisses > 0) {
    console.log(`\n2. HITTRAX RECORDS MISSES`);
    console.log(`   HitTrax may record swings & misses: ${htxMisses} low-velo swings found`);
    console.log(`   Blast always records: ${blastSwings.length} swings`);
    console.log(`   This could explain some of the mismatch.`);
  }

  const swingRate = blastSwings.length / blastDuration;
  const htxRate = htxOct30.length / htxDuration;
  console.log(`\n3. SWING RATE ANALYSIS`);
  console.log(`   Blast: ${swingRate.toFixed(2)} swings/minute`);
  console.log(`   HitTrax: ${htxRate.toFixed(2)} swings/minute`);

  if (Math.abs(swingRate - htxRate) > 0.5) {
    console.log(`   ⚠️  Significant rate difference - sessions may not be simultaneous`);
  }

  console.log('\n' + '═'.repeat(80));
}

const athleteId = process.argv[2] || 'edf7a6b8-cd9c-4eb5-bb17-8484b2214910';

analyzePairingIssues(athleteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
