/**
 * Analyze the distribution of time differences in matched swings
 */

const { createClient } = require('@supabase/supabase-js');
const { matchSwingsByTime } = require('../lib/paired-data/matching.ts');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeTimeDifferences(athleteId) {
  console.log('📊 Analyzing Time Differences in Matched Swings');
  console.log('═'.repeat(80));

  // Fetch swings
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

  const htxOct30 = htxSwings.filter(s => s.swing_timestamp.startsWith('10/30/2025'));

  console.log(`\nData: ${blastSwings.length} Blast swings, ${htxOct30.length} HitTrax swings`);

  // Match with 10s window
  const swingPairs = matchSwingsByTime(blastSwings, htxOct30, 10);
  const pairedSwings = swingPairs.filter(p => p.blastSwing && p.hittraxSwing);

  console.log(`\n⏱️  Time Difference Distribution (${pairedSwings.length} paired swings):`);
  console.log('─'.repeat(80));

  // Group by time difference ranges
  const ranges = [
    { max: 1, label: '0-1 seconds', count: 0 },
    { max: 2, label: '1-2 seconds', count: 0 },
    { max: 3, label: '2-3 seconds', count: 0 },
    { max: 4, label: '3-4 seconds', count: 0 },
    { max: 5, label: '4-5 seconds', count: 0 },
    { max: 6, label: '5-6 seconds', count: 0 },
    { max: 7, label: '6-7 seconds', count: 0 },
    { max: 8, label: '7-8 seconds', count: 0 },
    { max: 9, label: '8-9 seconds', count: 0 },
    { max: 10, label: '9-10 seconds', count: 0 }
  ];

  pairedSwings.forEach(pair => {
    const timeDiff = pair.timeDifferenceSeconds;
    for (const range of ranges) {
      if (timeDiff < range.max) {
        range.count++;
        break;
      }
    }
  });

  // Display histogram
  const maxCount = Math.max(...ranges.map(r => r.count));
  ranges.forEach(range => {
    const barLength = Math.round((range.count / maxCount) * 40);
    const bar = '█'.repeat(barLength);
    const pct = ((range.count / pairedSwings.length) * 100).toFixed(1);
    console.log(`${range.label.padEnd(15)} ${bar} ${range.count} (${pct}%)`);
  });

  // Calculate statistics
  const timeDiffs = pairedSwings.map(p => p.timeDifferenceSeconds).filter(t => t !== null);
  const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  const median = timeDiffs.sort((a, b) => a - b)[Math.floor(timeDiffs.length / 2)];
  const mode = timeDiffs
    .reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  const mostCommon = Object.entries(mode)
    .sort((a, b) => b[1] - a[1])[0];

  console.log('\n📈 Statistics:');
  console.log('─'.repeat(80));
  console.log(`Average:    ${avgDiff.toFixed(2)} seconds`);
  console.log(`Median:     ${median.toFixed(2)} seconds`);
  console.log(`Mode:       ${parseFloat(mostCommon[0]).toFixed(2)} seconds (appears ${mostCommon[1]} times)`);

  // Cumulative analysis
  console.log('\n📊 Cumulative Coverage:');
  console.log('─'.repeat(80));
  let cumulative = 0;
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(threshold => {
    const count = timeDiffs.filter(t => t <= threshold).length;
    cumulative = count;
    const pct = ((count / pairedSwings.length) * 100).toFixed(1);
    console.log(`≤ ${threshold}s:  ${count}/${pairedSwings.length} pairs (${pct}%)`);
  });

  // Recommendation
  console.log('\n💡 RECOMMENDATION:');
  console.log('═'.repeat(80));

  // Find the threshold that captures 90% of matches
  let threshold90 = 10;
  for (let i = 1; i <= 10; i++) {
    const count = timeDiffs.filter(t => t <= i).length;
    const pct = (count / pairedSwings.length) * 100;
    if (pct >= 90) {
      threshold90 = i;
      break;
    }
  }

  console.log(`To capture 90% of matches: ${threshold90}s threshold`);
  console.log(`Current 10s threshold captures: ${((cumulative / pairedSwings.length) * 100).toFixed(1)}%`);

  if (avgDiff < 6) {
    console.log(`\nAverage time diff is ${avgDiff.toFixed(2)}s - consider reducing to ${Math.ceil(avgDiff) + 2}s`);
    console.log('This would improve precision while maintaining high match rate.');
  }

  console.log('\n' + '═'.repeat(80));
}

const athleteId = process.argv[2] || 'edf7a6b8-cd9c-4eb5-bb17-8484b2214910';

analyzeTimeDifferences(athleteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
