/**
 * Get all 50th percentile values from percentile_lookup table
 * Grouped by metric and play level
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function get50thPercentiles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all unique metric columns
  const { data: metrics, error: metricsError } = await supabase
    .from('percentile_lookup')
    .select('metric_column')
    .order('metric_column');

  if (metricsError) {
    console.error('Error fetching metrics:', metricsError);
    return;
  }

  const uniqueMetrics = [...new Set(metrics?.map(m => m.metric_column) || [])];
  console.log(`Found ${uniqueMetrics.length} unique metrics\n`);

  // For each metric, get 50th percentile for each play level
  for (const metricColumn of uniqueMetrics) {
    console.log(`\n📊 ${metricColumn}`);
    console.log('='.repeat(80));

    const playLevels = ['Pro', 'High School', 'Youth', 'Overall'];

    for (const playLevel of playLevels) {
      const { data: percentile50, error } = await supabase
        .from('percentile_lookup')
        .select('value, percentile')
        .eq('metric_column', metricColumn)
        .eq('play_level', playLevel)
        .eq('percentile', 50)
        .single();

      if (error || !percentile50) {
        console.log(`  ${playLevel.padEnd(15)}: No data found`);
      } else if (percentile50 && percentile50.value !== null) {
        console.log(`  ${playLevel.padEnd(15)}: ${percentile50.value.toFixed(2)} (50th percentile)`);
      } else {
        console.log(`  ${playLevel.padEnd(15)}: NULL value`);
      }
    }
  }
}

get50thPercentiles();
