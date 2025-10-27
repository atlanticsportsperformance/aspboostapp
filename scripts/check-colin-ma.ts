import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColinMa() {
  // Find Colin Ma
  const { data: athletes, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, vald_profile_id, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%');

  if (athleteError) {
    console.error('Error finding athlete:', athleteError);
    return;
  }

  console.log('Colin Ma athlete data:');
  console.log(JSON.stringify(athletes, null, 2));

  if (athletes && athletes.length > 0) {
    const athleteId = athletes[0].id;

    // Check percentile history
    const { data: history, error: historyError } = await supabase
      .from('athlete_percentile_history')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false });

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return;
    }

    console.log('\n=== TOTAL RECORDS ===');
    console.log('Total percentile history records:', history?.length);

    // Group by test_type and metric
    const grouped: any = {};
    history?.forEach((record: any) => {
      const key = `${record.test_type}_${record.metric_name}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        date: record.test_date,
        value: record.value,
        percentile: record.percentile_play_level,
        test_id: record.test_id
      });
    });

    console.log('\n=== RECORDS BY TEST TYPE AND METRIC ===');
    for (const [key, records] of Object.entries(grouped)) {
      console.log(`\n${key}: ${(records as any[]).length} records`);
      console.log('Latest 3 entries:', JSON.stringify((records as any[]).slice(0, 3), null, 2));
    }

    // Check for duplicates
    const testIds = history?.map((r: any) => r.test_id) || [];
    const uniqueTestIds = new Set(testIds);
    console.log('\n=== DUPLICATE CHECK ===');
    console.log(`Total records: ${testIds.length}`);
    console.log(`Unique test IDs: ${uniqueTestIds.size}`);
    if (testIds.length !== uniqueTestIds.size) {
      console.log('⚠️  WARNING: Duplicate test_ids found!');

      // Find duplicates
      const testIdCounts: any = {};
      testIds.forEach(id => {
        testIdCounts[id] = (testIdCounts[id] || 0) + 1;
      });

      console.log('\nDuplicate test_ids:');
      Object.entries(testIdCounts).forEach(([id, count]) => {
        if ((count as number) > 1) {
          console.log(`  ${id}: ${count} times`);
        }
      });
    } else {
      console.log('✅ No duplicate test_ids found');
    }

    // Check for multiple entries on same date
    console.log('\n=== SAME-DATE ENTRIES CHECK ===');
    for (const [key, records] of Object.entries(grouped)) {
      const dates = (records as any[]).map(r => r.date);
      const uniqueDates = new Set(dates);
      if (dates.length !== uniqueDates.size) {
        console.log(`⚠️  ${key} has multiple entries on same date`);

        const dateCounts: any = {};
        dates.forEach(date => {
          dateCounts[date] = (dateCounts[date] || 0) + 1;
        });

        Object.entries(dateCounts).forEach(([date, count]) => {
          if ((count as number) > 1) {
            console.log(`  ${date}: ${count} entries`);
          }
        });
      }
    }

    // Check FORCE_PROFILE composite
    console.log('\n=== FORCE_PROFILE COMPOSITE ===');
    const forceProfile = history?.filter((r: any) => r.test_type === 'FORCE_PROFILE');
    console.log(`Force Profile records: ${forceProfile?.length}`);
    forceProfile?.slice(0, 5).forEach((record: any) => {
      console.log(`  ${record.test_date}: ${record.percentile_play_level}% (test_id: ${record.test_id})`);
    });
  }
}

checkColinMa().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
