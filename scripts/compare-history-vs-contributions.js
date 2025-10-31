const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareHistoryVsContributions() {
  console.log('=== COMPARING HISTORY VS CONTRIBUTIONS ===\n');

  // Get all Youth history records (group by test_id to avoid metric duplicates)
  const { data: historyRecords } = await supabase
    .from('athlete_percentile_history')
    .select('athlete_id, test_type, test_id, test_date, play_level')
    .eq('play_level', 'Youth')
    .order('athlete_id', { ascending: true })
    .order('test_type', { ascending: true })
    .order('test_date', { ascending: true });

  // Remove duplicates (same test_id appears multiple times for different metrics)
  const uniqueHistory = [];
  const seenTestIds = new Set();
  historyRecords?.forEach(record => {
    const key = `${record.athlete_id}-${record.test_type}-${record.test_id}`;
    if (!seenTestIds.has(key)) {
      seenTestIds.add(key);
      uniqueHistory.push(record);
    }
  });

  // Get all Youth contributions
  const { data: contributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('athlete_id, test_type, test_id, test_date, playing_level')
    .eq('playing_level', 'Youth')
    .order('athlete_id', { ascending: true })
    .order('test_type', { ascending: true });

  console.log(`Total UNIQUE tests in athlete_percentile_history: ${uniqueHistory.length}`);
  console.log(`Total contributions in athlete_percentile_contributions: ${contributions?.length || 0}\n`);

  // Group history by athlete and test type
  const historyByAthleteAndType = {};
  uniqueHistory.forEach(record => {
    const key = `${record.athlete_id}-${record.test_type}`;
    if (!historyByAthleteAndType[key]) {
      historyByAthleteAndType[key] = [];
    }
    historyByAthleteAndType[key].push(record);
  });

  // Group contributions by athlete and test type
  const contributionsByAthleteAndType = {};
  contributions?.forEach(record => {
    const key = `${record.athlete_id}-${record.test_type}`;
    contributionsByAthleteAndType[key] = record;
  });

  console.log('DETAILED COMPARISON:\n');

  // Get unique athletes
  const athleteIds = [...new Set(uniqueHistory.map(r => r.athlete_id))];

  athleteIds.forEach((athleteId, idx) => {
    console.log(`Athlete ${idx + 1}: ${athleteId.substring(0, 8)}...`);

    const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];

    testTypes.forEach(testType => {
      const key = `${athleteId}-${testType}`;
      const historyTests = historyByAthleteAndType[key] || [];
      const contribution = contributionsByAthleteAndType[key];

      if (historyTests.length === 0) {
        // No tests at all
        return;
      }

      const testCount = historyTests.length;
      const shouldHaveContribution = testCount >= 2;

      console.log(`   ${testType}: ${testCount} test${testCount !== 1 ? 's' : ''} in history`);

      if (shouldHaveContribution) {
        if (contribution) {
          // Sort tests by date to find which one should be in contributions
          const sortedTests = [...historyTests].sort((a, b) =>
            new Date(b.test_date) - new Date(a.test_date)
          );
          const mostRecentTest = sortedTests[0];
          const isCorrect = contribution.test_id === mostRecentTest.test_id;

          console.log(`      ✅ Has contribution (${isCorrect ? 'correct test' : 'WRONG TEST!'})`);
          console.log(`         History most recent: ${mostRecentTest.test_id.substring(0, 8)}... (${mostRecentTest.test_date})`);
          console.log(`         Contribution test:   ${contribution.test_id.substring(0, 8)}... (${contribution.test_date})`);
        } else {
          console.log(`      ❌ MISSING contribution (should have one!)`);
        }
      } else {
        if (contribution) {
          console.log(`      ⚠️  Has contribution but shouldn't (only ${testCount} test)`);
        } else {
          console.log(`      ✅ Correctly has no contribution (first test)`);
        }
      }
    });

    console.log('');
  });

  console.log('=== SUMMARY ===\n');

  // Count how many should have contributions
  let shouldHaveCount = 0;
  let actuallyHaveCount = contributions?.length || 0;
  let missingCount = 0;

  Object.entries(historyByAthleteAndType).forEach(([key, tests]) => {
    if (tests.length >= 2) {
      shouldHaveCount++;
      if (!contributionsByAthleteAndType[key]) {
        missingCount++;
      }
    }
  });

  console.log(`Should have contributions: ${shouldHaveCount}`);
  console.log(`Actually have contributions: ${actuallyHaveCount}`);
  console.log(`Missing contributions: ${missingCount}`);
  console.log('');

  if (missingCount > 0) {
    console.log('❌ ISSUE: Some 2nd+ tests are not in contributions table');
    console.log('');
    console.log('EXPECTED BEHAVIOR:');
    console.log('When an athlete takes their 2nd test (per test type, per play level),');
    console.log('it should automatically be added to athlete_percentile_contributions.');
  } else if (actuallyHaveCount === shouldHaveCount) {
    console.log('✅ CORRECT: All 2nd+ tests are in contributions table');
  } else if (actuallyHaveCount > shouldHaveCount) {
    console.log('⚠️  WARNING: More contributions than expected');
  }
}

compareHistoryVsContributions().catch(console.error);
