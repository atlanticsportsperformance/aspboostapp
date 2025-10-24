import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kttxecobblqxfaojbjjh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHhlY29iYmxxeGZhb2piampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1OTM1MzQsImV4cCI6MjA1MTE2OTUzNH0.dy2hG0vJHKYJqWEcdG3_wDFnGAZTvpLcwyKAe2JBQWs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeKPISystem() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('KPI & PROGRESS TRACKING SYSTEM ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // SECTION 1: EXERCISE METRIC SCHEMA ANALYSIS
  console.log('SECTION 1: EXERCISE METRIC SCHEMA ANALYSIS');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, category, metric_schema, tags')
    .not('metric_schema', 'is', null)
    .limit(10);

  console.log('QUERY 1: Sample exercises with metric_schema');
  if (exercisesError) {
    console.error('Error:', exercisesError);
  } else {
    console.log('Found', exercises?.length || 0, 'exercises with metric_schema');
    exercises?.forEach((ex: any) => {
      console.log('\n---');
      console.log('ID:', ex.id);
      console.log('Name:', ex.name);
      console.log('Category:', ex.category);
      console.log('Metric Schema:', JSON.stringify(ex.metric_schema, null, 2));
      console.log('Tags:', ex.tags);
    });
  }

  // Get all unique metrics
  const { data: allExercises } = await supabase
    .from('exercises')
    .select('metric_schema')
    .not('metric_schema', 'is', null);

  console.log('\n\nQUERY 2: All unique metric types across exercises');
  const metricTypes = new Set();
  const metricsByType = new Map();

  allExercises?.forEach((ex: any) => {
    if (Array.isArray(ex.metric_schema)) {
      ex.metric_schema.forEach((metric: any) => {
        const key = `${metric.name}|${metric.unit}|${metric.type}`;
        metricTypes.add(key);

        if (!metricsByType.has(metric.type)) {
          metricsByType.set(metric.type, []);
        }
        metricsByType.get(metric.type).push(metric);
      });
    }
  });

  console.log('Total unique metric combinations:', metricTypes.size);
  console.log('\nMetrics grouped by type:');
  metricsByType.forEach((metrics, type) => {
    console.log(`\n${type}:`);
    const uniqueMetrics = new Map();
    metrics.forEach((m: any) => {
      const key = `${m.name} (${m.unit})`;
      if (!uniqueMetrics.has(key)) {
        uniqueMetrics.set(key, m);
      }
    });
    uniqueMetrics.forEach((m, key) => {
      console.log(`  - ${key}`);
    });
  });

  // SECTION 2: ROUTINE EXERCISES CONFIGURATION
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('SECTION 2: ROUTINE EXERCISES CONFIGURATION ANALYSIS');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const { data: routineExercises, error: reError } = await supabase
    .from('routine_exercises')
    .select(`
      id,
      sets,
      reps_min,
      reps_max,
      time_seconds,
      percent_1rm,
      rpe_target,
      rest_seconds,
      metric_targets,
      intensity_targets,
      set_configurations,
      notes,
      exercises(name, category, metric_schema)
    `)
    .eq('is_placeholder', false)
    .limit(10);

  console.log('QUERY 3: Sample routine exercises with configuration');
  if (reError) {
    console.error('Error:', reError);
  } else {
    console.log('Found', routineExercises?.length || 0, 'routine exercises');
    routineExercises?.forEach((re: any) => {
      console.log('\n---');
      console.log('ID:', re.id);
      console.log('Exercise:', re.exercises?.name);
      console.log('Category:', re.exercises?.category);
      console.log('Sets:', re.sets);
      console.log('Reps Min:', re.reps_min);
      console.log('Reps Max:', re.reps_max);
      console.log('Time Seconds:', re.time_seconds);
      console.log('Percent 1RM:', re.percent_1rm);
      console.log('RPE Target:', re.rpe_target);
      console.log('Rest Seconds:', re.rest_seconds);
      console.log('Metric Targets:', JSON.stringify(re.metric_targets, null, 2));
      console.log('Intensity Targets:', JSON.stringify(re.intensity_targets, null, 2));
      console.log('Set Configurations:', JSON.stringify(re.set_configurations, null, 2));
      console.log('Notes:', re.notes);
    });
  }

  // SECTION 3: EXERCISE LOGS CHECK
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('SECTION 3: EXERCISE LOGS TABLE CHECK');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const { data: exerciseLogsTable, error: elTableError } = await supabase
    .from('exercise_logs')
    .select('*')
    .limit(1);

  if (elTableError) {
    console.log('❌ exercise_logs table does NOT exist');
    console.log('Error:', elTableError.message);
  } else {
    console.log('✅ exercise_logs table EXISTS');

    const { count } = await supabase
      .from('exercise_logs')
      .select('*', { count: 'exact', head: true });

    console.log('Total rows:', count);

    const { data: sampleLogs } = await supabase
      .from('exercise_logs')
      .select('*')
      .limit(5);

    console.log('\nSample data:');
    sampleLogs?.forEach((log: any) => {
      console.log(JSON.stringify(log, null, 2));
    });
  }

  // SECTION 4: ATHLETE BASELINES CHECK
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('SECTION 4: ATHLETE BASELINES TABLE CHECK');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const { data: baselinesTable, error: abTableError } = await supabase
    .from('athlete_baselines')
    .select('*')
    .limit(1);

  if (abTableError) {
    console.log('❌ athlete_baselines table does NOT exist');
    console.log('Error:', abTableError.message);
  } else {
    console.log('✅ athlete_baselines table EXISTS');

    const { count } = await supabase
      .from('athlete_baselines')
      .select('*', { count: 'exact', head: true });

    console.log('Total rows:', count);

    const { data: sampleBaselines } = await supabase
      .from('athlete_baselines')
      .select('*')
      .limit(5);

    console.log('\nSample data:');
    sampleBaselines?.forEach((baseline: any) => {
      console.log(JSON.stringify(baseline, null, 2));
    });
  }

  // Check athlete_maxes table
  console.log('\n\nChecking athlete_maxes table...');
  const { data: maxesTable, error: amTableError } = await supabase
    .from('athlete_maxes')
    .select('*')
    .limit(1);

  if (amTableError) {
    console.log('❌ athlete_maxes table does NOT exist');
    console.log('Error:', amTableError.message);
  } else {
    console.log('✅ athlete_maxes table EXISTS');

    const { count } = await supabase
      .from('athlete_maxes')
      .select('*', { count: 'exact', head: true });

    console.log('Total rows:', count);

    const { data: sampleMaxes } = await supabase
      .from('athlete_maxes')
      .select('*')
      .limit(5);

    console.log('\nSample data:');
    sampleMaxes?.forEach((max: any) => {
      console.log(JSON.stringify(max, null, 2));
    });
  }

  // SECTION 5: WORKOUT INSTANCES STATUS
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('SECTION 5: WORKOUT INSTANCES STATUS');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const { data: statusCounts } = await supabase
    .from('workout_instances')
    .select('status');

  const statusMap = new Map();
  statusCounts?.forEach((wi: any) => {
    const count = statusMap.get(wi.status) || 0;
    statusMap.set(wi.status, count + 1);
  });

  console.log('Workout instances by status:');
  statusMap.forEach((count, status) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log('  TOTAL:', statusCounts?.length || 0);

  const { data: sampleInstances } = await supabase
    .from('workout_instances')
    .select(`
      id,
      scheduled_date,
      status,
      started_at,
      completed_at,
      workouts(name),
      athletes(id)
    `)
    .limit(10);

  console.log('\nSample workout instances:');
  sampleInstances?.forEach((wi: any) => {
    console.log('\n---');
    console.log('ID:', wi.id);
    console.log('Workout:', wi.workouts?.name);
    console.log('Athlete ID:', wi.athletes?.id);
    console.log('Scheduled:', wi.scheduled_date);
    console.log('Status:', wi.status);
    console.log('Started:', wi.started_at);
    console.log('Completed:', wi.completed_at);
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════');
}

analyzeKPISystem().catch(console.error);
