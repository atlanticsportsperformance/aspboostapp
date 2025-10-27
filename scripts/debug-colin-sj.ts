import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugColinSJ() {
  const colinId = 'c4909ac5-e9d5-4454-bae9-303ed276d564';

  console.log('=== COLIN MA SJ PEAK POWER DEBUG ===\n');

  // Get Colin's play level
  const { data: athlete } = await supabase
    .from('athletes')
    .select('play_level')
    .eq('id', colinId)
    .single();

  console.log('Colin\'s play level:', athlete?.play_level);

  // Get Colin's SJ Peak Power values
  const { data: colinData } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, value, percentile_play_level, percentile_overall')
    .eq('athlete_id', colinId)
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .order('test_date', { ascending: false });

  console.log('\nColin\'s SJ Peak Power:');
  colinData?.forEach((record: any) => {
    console.log(`  ${record.test_date.split('T')[0]}: ${record.value.toFixed(1)}W - ${record.percentile_play_level}th percentile (play level)`);
  });

  // Get ALL SJ Peak Power values (no play level filter) - THIS IS WHAT THE API IS CURRENTLY DOING
  const { data: allValues } = await supabase
    .from('athlete_percentile_history')
    .select('value')
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .not('value', 'is', null);

  if (allValues && allValues.length > 0) {
    const sortedAll = allValues.map(v => v.value).sort((a, b) => a - b);
    const p75IndexAll = Math.floor(sortedAll.length * 0.75);

    console.log(`\n75th Percentile (ALL ATHLETES, NO FILTER):`);
    console.log(`  Total athletes: ${sortedAll.length}`);
    console.log(`  75th percentile value: ${sortedAll[p75IndexAll].toFixed(1)}W`);
    console.log(`  This is what the API is currently returning!`);
  }

  // Get SJ Peak Power values FOR HIGH SCHOOL ONLY - THIS IS WHAT WE SHOULD BE DOING
  const { data: playLevelValues } = await supabase
    .from('athlete_percentile_history')
    .select('value, athlete_id')
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .not('value', 'is', null);

  // Get play levels for all athletes
  const athleteIds = Array.from(new Set(playLevelValues?.map((v: any) => v.athlete_id) || []));
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, play_level')
    .in('id', athleteIds);

  const athletePlayLevelMap = new Map(athletes?.map((a: any) => [a.id, a.play_level]));

  // Filter to High School only
  const highSchoolValues = playLevelValues
    ?.filter((v: any) => athletePlayLevelMap.get(v.athlete_id) === 'High School')
    .map((v: any) => v.value) || [];

  if (highSchoolValues.length > 0) {
    const sortedHS = highSchoolValues.sort((a, b) => a - b);
    const p75IndexHS = Math.floor(sortedHS.length * 0.75);

    console.log(`\n75th Percentile (HIGH SCHOOL ONLY - CORRECT):`);
    console.log(`  High School athletes: ${sortedHS.length}`);
    console.log(`  75th percentile value: ${sortedHS[p75IndexHS].toFixed(1)}W`);
    console.log(`  Colin's value: ${colinData?.[0]?.value.toFixed(1)}W (${colinData?.[0]?.percentile_play_level}th percentile)`);

    // Check if Colin's percentile makes sense
    const colinValue = colinData?.[0]?.value || 0;
    const position = sortedHS.filter(v => v <= colinValue).length;
    const calculatedPercentile = (position / sortedHS.length) * 100;

    console.log(`  Calculated percentile: ${calculatedPercentile.toFixed(1)}% (should be ~${colinData?.[0]?.percentile_play_level}%)`);
  }

  console.log('\n=== ISSUE FOUND ===');
  console.log('The API is querying ALL athletes without filtering by play_level!');
  console.log('This makes the 75th percentile line meaningless for play-level comparisons.');
}

debugColinSJ().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
