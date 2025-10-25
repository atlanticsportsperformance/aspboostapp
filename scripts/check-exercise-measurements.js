const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Throwing-specific measurements that should NOT be on S&C or Hitting exercises
const THROWING_ONLY = ['exit_velo', 'peak_velo', 'gray_ball_velo', 'yellow_ball_velo', 'red_ball_velo', 'blue_ball_velo', 'green_ball_velo'];

async function checkExercises() {
  console.log('Checking exercises for incorrect measurements...\n');

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, category, metric_schema, is_placeholder')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error);
    return;
  }

  console.log(`Found ${exercises.length} active exercises\n`);

  const issues = [];

  exercises.forEach((ex) => {
    const measurements = ex.metric_schema?.measurements || [];
    const measurementIds = measurements.map(m => m.id);

    // Check for throwing-only measurements on non-throwing exercises
    if (ex.category !== 'throwing') {
      const wrongMeasurements = measurementIds.filter(id => THROWING_ONLY.includes(id));
      if (wrongMeasurements.length > 0) {
        issues.push({
          exercise: ex,
          wrongMeasurements,
          reason: `${ex.category} exercise has throwing-only measurements`
        });
      }
    }

    // Log placeholders with no measurements
    if (ex.is_placeholder && measurements.length === 0) {
      console.log(`⚠️  Placeholder "${ex.name}" has NO measurements`);
    }
  });

  if (issues.length > 0) {
    console.log(`\n❌ Found ${issues.length} exercises with incorrect measurements:\n`);
    issues.forEach(({ exercise, wrongMeasurements, reason }) => {
      console.log(`  Exercise: "${exercise.name}" (${exercise.category})`);
      console.log(`  Issue: ${reason}`);
      console.log(`  Wrong measurements: ${wrongMeasurements.join(', ')}`);
      console.log(`  All measurements: ${exercise.metric_schema?.measurements.map(m => m.id).join(', ')}`);
      console.log('');
    });
  } else {
    console.log('✅ No issues found!');
  }

  // Count measurements across all exercises
  const measurementCounts = new Map();
  exercises.forEach((ex) => {
    const measurements = ex.metric_schema?.measurements || [];
    measurements.forEach((m) => {
      const key = m.id;
      if (!measurementCounts.has(key)) {
        measurementCounts.set(key, { name: m.name, count: 0, categories: new Set() });
      }
      const info = measurementCounts.get(key);
      info.count++;
      info.categories.add(ex.category);
    });
  });

  console.log('\n📊 Measurement usage across all exercises:');
  Array.from(measurementCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([id, info]) => {
      const cats = Array.from(info.categories).join(', ');
      console.log(`  ${info.name} (${id}): ${info.count} exercises [${cats}]`);
    });
}

checkExercises().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
