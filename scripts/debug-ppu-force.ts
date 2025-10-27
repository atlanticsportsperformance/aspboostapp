import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPPUForce() {
  const colinId = 'c4909ac5-e9d5-4454-bae9-303ed276d564';

  console.log('=== COLIN MA PPU PEAK TAKEOFF FORCE DEBUG ===\n');

  // Get Colin's play level
  const { data: athlete } = await supabase
    .from('athletes')
    .select('play_level')
    .eq('id', colinId)
    .single();

  console.log('Colin\'s play level:', athlete?.play_level);

  // Get Colin's PPU Peak Takeoff Force values
  const { data: colinData } = await supabase
    .from('athlete_percentile_history')
    .select('test_date, value, percentile_play_level, percentile_overall')
    .eq('athlete_id', colinId)
    .eq('test_type', 'PPU')
    .eq('metric_name', 'Peak Takeoff Force (N)')
    .order('test_date', { ascending: false });

  console.log('\nColin\'s PPU Peak Takeoff Force:');
  colinData?.forEach((record: any) => {
    console.log(`  ${record.test_date.split('T')[0]}: ${record.value.toFixed(1)}N - ${record.percentile_play_level}th percentile (play level)`);
  });

  // Get ALL PPU Peak Takeoff Force records with athlete_id
  const { data: allRecords } = await supabase
    .from('athlete_percentile_history')
    .select('value, athlete_id')
    .eq('test_type', 'PPU')
    .eq('metric_name', 'Peak Takeoff Force (N)')
    .not('value', 'is', null);

  console.log(`\nTotal PPU records in database: ${allRecords?.length}`);

  // Get play levels for all athletes
  const athleteIds = Array.from(new Set(allRecords?.map((r: any) => r.athlete_id) || []));
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, play_level, first_name, last_name')
    .in('id', athleteIds);

  const athleteMap = new Map(athletes?.map((a: any) => [a.id, { play_level: a.play_level, name: `${a.first_name} ${a.last_name}` }]));

  // Filter to High School only
  const highSchoolRecords = allRecords
    ?.filter((r: any) => athleteMap.get(r.athlete_id)?.play_level === 'High School')
    .map((r: any) => ({
      value: r.value,
      athlete_id: r.athlete_id,
      name: athleteMap.get(r.athlete_id)?.name
    })) || [];

  console.log(`\nHigh School PPU records: ${highSchoolRecords.length}`);

  if (highSchoolRecords.length > 0) {
    const sortedValues = highSchoolRecords.map(r => r.value).sort((a, b) => a - b);
    const p75Index = Math.floor(sortedValues.length * 0.75);
    const p75Value = sortedValues[p75Index];

    console.log(`\n75th Percentile Calculation:`);
    console.log(`  Total values: ${sortedValues.length}`);
    console.log(`  75th percentile index: ${p75Index}`);
    console.log(`  75th percentile value: ${p75Value.toFixed(1)}N`);

    // Show all values sorted
    console.log('\nAll High School PPU Peak Takeoff Force values (sorted):');
    sortedValues.forEach((val, idx) => {
      const percentile = ((idx + 1) / sortedValues.length * 100);
      const isP75 = idx === p75Index;
      const isColin = Math.abs(val - (colinData?.[0]?.value || 0)) < 0.1;
      console.log(`  ${idx + 1}. ${val.toFixed(1)}N - ${percentile.toFixed(1)}th percentile ${isP75 ? '← 75th %ile' : ''} ${isColin ? '← COLIN' : ''}`);
    });

    // Find Colin's position
    const colinValue = colinData?.[0]?.value || 0;
    const position = sortedValues.filter(v => v <= colinValue).length;
    const calculatedPercentile = (position / sortedValues.length) * 100;

    console.log(`\nColin's Position:`);
    console.log(`  Colin's value: ${colinValue.toFixed(1)}N`);
    console.log(`  Position in sorted list: ${position} of ${sortedValues.length}`);
    console.log(`  Calculated percentile: ${calculatedPercentile.toFixed(1)}%`);
    console.log(`  Stored percentile: ${colinData?.[0]?.percentile_play_level}%`);
    console.log(`  75th percentile value: ${p75Value.toFixed(1)}N`);
    console.log(`  Difference: ${(colinValue - p75Value).toFixed(1)}N (${((colinValue / p75Value - 1) * 100).toFixed(1)}% higher)`);

    if (colinValue > p75Value) {
      console.log('\n✅ Colin IS above 75th percentile - chart should show him above the line');
    } else {
      console.log('\n⚠️  Colin is BELOW 75th percentile - chart should show him below the line');
    }
  }

  // Check standard deviation
  if (highSchoolRecords.length > 0) {
    const values = highSchoolRecords.map(r => r.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    console.log(`\nStandard Deviation:`);
    console.log(`  Mean: ${mean.toFixed(1)}N`);
    console.log(`  Std Dev: ${stdDev.toFixed(1)}N`);
    console.log(`  +1 SD line: ${(sortedValues[p75Index] + stdDev).toFixed(1)}N`);
    console.log(`  -1 SD line: ${(sortedValues[p75Index] - stdDev).toFixed(1)}N`);
  }
}

debugPPUForce().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
