/**
 * Verify that percentile calculations are actually using athlete_percentile_contributions
 *
 * Strategy:
 * 1. Check Colin Ma's contribution values
 * 2. Query the percentile calculation system (driveline_percentiles + athlete_percentile_contributions)
 * 3. Verify Colin's values appear in the dataset used for percentile calculations
 * 4. Compare percentiles WITH and WITHOUT athlete contributions
 */

import { createClient } from '@supabase/supabase-js';

async function verifyPercentileLookup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Verifying percentile lookup uses athlete_percentile_contributions...\n');

  // Find Colin Ma
  const { data: colin } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, play_level')
    .ilike('first_name', '%colin%')
    .ilike('last_name', '%ma%')
    .single();

  if (!colin) {
    console.error('❌ Could not find Colin Ma');
    return;
  }

  console.log(`✅ Found: ${colin.first_name} ${colin.last_name}`);
  console.log(`   Play Level: ${colin.play_level}\n`);

  // Get Colin's contributions
  const { data: colinContributions } = await supabase
    .from('athlete_percentile_contributions')
    .select('*')
    .eq('athlete_id', colin.id);

  if (!colinContributions || colinContributions.length === 0) {
    console.error('❌ Colin has no contributions');
    return;
  }

  console.log(`📊 Colin's Contributions: ${colinContributions.length}\n`);

  // For each test type, verify the data is being used
  for (const contrib of colinContributions) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${contrib.test_type} - ${contrib.playing_level}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get the metric mapping for this test type
    const { data: metricMappings } = await supabase
      .from('percentile_metric_mappings')
      .select('*')
      .eq('test_type', contrib.test_type);

    if (!metricMappings || metricMappings.length === 0) {
      console.log('⚠️  No metric mappings found for', contrib.test_type);
      continue;
    }

    console.log(`📋 Metrics tracked for ${contrib.test_type}:`);

    for (const mapping of metricMappings) {
      const metricName = mapping.metric_name;
      const columnName = mapping.vald_field_name;
      const colinValue = contrib[columnName];

      console.log(`\n   ${metricName}:`);
      console.log(`      Column: ${columnName}`);
      console.log(`      Colin's Value: ${colinValue}`);

      if (colinValue === null) {
        console.log('      ❌ NULL - Not contributed!');
        continue;
      }

      // Count total data points from Driveline for this metric
      const { count: drivelineCount } = await supabase
        .from('driveline_percentiles')
        .select('*', { count: 'exact', head: true })
        .eq('test_type', contrib.test_type)
        .eq('playing_level', contrib.playing_level)
        .eq('metric_name', metricName)
        .not('metric_value', 'is', null);

      // Count total contributions from athletes for this metric
      const { count: athleteCount } = await supabase
        .from('athlete_percentile_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('test_type', contrib.test_type)
        .eq('playing_level', contrib.playing_level)
        .not(columnName, 'is', null);

      console.log(`      📊 Dataset Size:`);
      console.log(`         Driveline: ${drivelineCount} rows`);
      console.log(`         Athletes: ${athleteCount} contributions`);
      console.log(`         Total: ${(drivelineCount || 0) + (athleteCount || 0)} data points`);

      // Check if Colin's value exists in the combined dataset
      // First check Driveline
      const { data: drivelineMatch } = await supabase
        .from('driveline_percentiles')
        .select('metric_value')
        .eq('test_type', contrib.test_type)
        .eq('playing_level', contrib.playing_level)
        .eq('metric_name', metricName)
        .eq('metric_value', colinValue)
        .limit(1);

      // Then check athlete contributions
      const { data: athleteMatch, count: athleteMatchCount } = await supabase
        .from('athlete_percentile_contributions')
        .select(columnName, { count: 'exact' })
        .eq('test_type', contrib.test_type)
        .eq('playing_level', contrib.playing_level)
        .eq(columnName, colinValue);

      if (athleteMatchCount && athleteMatchCount > 0) {
        console.log(`      ✅ Colin's value FOUND in athlete_percentile_contributions (${athleteMatchCount} match${athleteMatchCount > 1 ? 'es' : ''})`);
      } else if (drivelineMatch && drivelineMatch.length > 0) {
        console.log(`      ℹ️  Value exists in Driveline data`);
      } else {
        console.log(`      ⚠️  Value not found in dataset`);
      }

      // Calculate where Colin ranks (approximate)
      if (athleteCount && athleteCount > 1) {
        // Get all athlete values for this metric
        const { data: allAthleteValues } = await supabase
          .from('athlete_percentile_contributions')
          .select(columnName)
          .eq('test_type', contrib.test_type)
          .eq('playing_level', contrib.playing_level)
          .not(columnName, 'is', null);

        if (allAthleteValues && allAthleteValues.length > 0) {
          const values = allAthleteValues.map(v => v[columnName]).sort((a, b) => a - b);
          const colinRank = values.filter(v => v < colinValue).length + 1;
          const percentile = (colinRank / values.length) * 100;

          console.log(`      📈 Among Athletes:`);
          console.log(`         Rank: ${colinRank}/${values.length}`);
          console.log(`         Percentile: ${percentile.toFixed(1)}%`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Verification Complete');
  console.log(`${'='.repeat(60)}\n`);
}

verifyPercentileLookup().catch(console.error);
