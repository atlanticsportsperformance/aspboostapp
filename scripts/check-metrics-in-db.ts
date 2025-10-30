// Check what metrics are actually in the database
import { createClient } from '@supabase/supabase-js';

async function checkMetrics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: swings, error } = await supabase
    .from('blast_swings')
    .select('metrics')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!swings || swings.length === 0) {
    console.log('No swings in database yet. Run a sync first!');
    return;
  }

  const metrics = swings[0].metrics as Record<string, any>;
  const metricNames = Object.keys(metrics).sort();

  console.log('📊 BLAST MOTION METRICS (from database):\n');
  console.log('='.repeat(80));
  console.log(`\nTotal Metrics: ${metricNames.length}\n`);

  metricNames.forEach((key, index) => {
    const metric = metrics[key];
    console.log(`${index + 1}. ${metric.display_name || key}`);
    console.log(`   Database Key: "${key}"`);
    console.log(`   Sample Value: ${metric.value} ${metric.unit || ''}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n📋 SUGGESTED COLUMNS FOR DATABASE:\n');
  console.log('Most Important Metrics to Extract as Columns:\n');

  const important = [
    'bat_speed',
    'bat_path_angle',
    'time_to_contact',
    'plane_score',
    'peak_hand_speed',
    'power',
    'rotation_score',
    'on_plane_efficiency',
    'connection_score',
    'vertical_bat_angle'
  ];

  important.forEach((key) => {
    if (metricNames.includes(key)) {
      const metric = metrics[key];
      console.log(`  ✅ ${key} - "${metric.display_name || key}"`);
    } else {
      console.log(`  ❌ ${key} - NOT FOUND`);
    }
  });

  console.log('\n📝 ALL METRIC KEYS:\n');
  metricNames.forEach((key) => {
    console.log(`  - ${key}`);
  });
}

checkMetrics();
