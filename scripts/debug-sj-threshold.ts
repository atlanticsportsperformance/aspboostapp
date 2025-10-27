import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSJThreshold() {
  // Get Colin's info (note: first_name has trailing space in DB)
  const { data: colin, error: colinError } = await serviceSupabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .eq('last_name', 'Ma')
    .ilike('first_name', 'Colin%')
    .single();

  if (colinError || !colin) {
    console.error('Error finding Colin:', colinError);
    return;
  }

  console.log('\n=== Colin Ma Info ===');
  console.log(`ID: ${colin.id}`);
  console.log(`Name: ${colin.first_name} ${colin.last_name}`);
  console.log(`Play Level: ${colin.play_level}`);

  // Get Colin's latest SJ Peak Power
  const { data: colinSJ } = await serviceSupabase
    .from('athlete_percentile_history')
    .select('*')
    .eq('athlete_id', colin.id)
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .order('test_date', { ascending: false })
    .limit(1)
    .single();

  console.log('\n=== Colin\'s Latest SJ Peak Power ===');
  console.log(`Value: ${colinSJ.value}W`);
  console.log(`Percentile (play level): ${colinSJ.percentile_play_level}th`);
  console.log(`Test Date: ${colinSJ.test_date}`);

  // Get ALL SJ Peak Power records
  const { data: allRecords } = await serviceSupabase
    .from('athlete_percentile_history')
    .select('value, athlete_id')
    .eq('test_type', 'SJ')
    .eq('metric_name', 'Peak Power (W)')
    .not('value', 'is', null);

  console.log(`\n=== All SJ Peak Power Records: ${allRecords.length} total ===`);

  // Get athlete play levels
  const athleteIds = Array.from(new Set(allRecords.map(r => r.athlete_id)));
  const { data: athletes } = await serviceSupabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .in('id', athleteIds);

  const athleteMap = new Map(athletes.map(a => [a.id, { name: `${a.first_name} ${a.last_name}`, play_level: a.play_level }]));

  // Filter to High School only
  const highSchoolValues = allRecords
    .filter(r => athleteMap.get(r.athlete_id)?.play_level === 'High School')
    .map(r => r.value);

  console.log(`\n=== High School Athletes (Colin's play level) ===`);
  console.log(`Total records: ${highSchoolValues.length}`);
  console.log(`Values: ${highSchoolValues.sort((a, b) => b - a).join(', ')}`);

  if (highSchoolValues.length > 0) {
    const sorted = [...highSchoolValues].sort((a, b) => a - b);
    const p75Index = Math.floor(sorted.length * 0.75);
    const p75Value = sorted[p75Index];
    console.log(`75th percentile value (High School): ${p75Value}W`);
    console.log(`Colin's value (${colinSJ.value}W) should be ${colinSJ.value >= p75Value ? 'ABOVE' : 'BELOW'} this line`);
  }

  // Check ALL athletes (no filter)
  const allValues = allRecords.map(r => r.value);
  const sortedAll = [...allValues].sort((a, b) => a - b);
  const p75IndexAll = Math.floor(sortedAll.length * 0.75);
  const p75ValueAll = sortedAll[p75IndexAll];

  console.log(`\n=== ALL Athletes (NO FILTER) ===`);
  console.log(`Total records: ${allValues.length}`);
  console.log(`75th percentile value (ALL): ${p75ValueAll}W`);
  console.log(`This is what the API might be returning incorrectly!`);
}

debugSJThreshold();
