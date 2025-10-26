/**
 * Apply the threshold-only percentile migration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔧 Applying Threshold-Only Percentile Migration\n');

  // Drop the old function
  console.log('1. Dropping old function...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql_query: 'DROP FUNCTION IF EXISTS recalculate_percentiles_for_metric(TEXT, TEXT)'
  });

  if (dropError) {
    console.error('❌ Error dropping function:', dropError.message);
    return;
  }
  console.log('✅ Dropped old function\n');

  // Create new function that stores only thresholds
  console.log('2. Creating new threshold-only function...');

  const newFunctionSQL = `
CREATE OR REPLACE FUNCTION recalculate_percentiles_for_metric(
  p_metric_column TEXT,
  p_play_level TEXT
)
RETURNS INT
LANGUAGE plpgsql
AS $func$
DECLARE
  v_insert_count INT := 0;
  v_value FLOAT;
  v_total_count INT;
  v_target_rank INT;
BEGIN
  -- Delete existing percentiles for this metric/level
  DELETE FROM percentile_lookup
  WHERE metric_column = p_metric_column
  AND play_level = p_play_level;

  -- Get total count first
  EXECUTE format('
    SELECT COUNT(*) FROM (
      SELECT %I AS value FROM driveline_seed_data
      WHERE %I IS NOT NULL
      AND ($1 = ''Overall'' OR playing_level = $1)

      UNION ALL

      SELECT %I AS value FROM athlete_percentile_contributions
      WHERE %I IS NOT NULL
      AND ($1 = ''Overall'' OR playing_level = $1)
    ) combined
  ', p_metric_column, p_metric_column, p_metric_column, p_metric_column)
  INTO v_total_count
  USING p_play_level;

  -- For each percentile (0-100), find the MINIMUM value that reaches that percentile
  FOR v_percentile_int IN 0..100 LOOP
    -- Calculate target rank for this percentile
    v_target_rank := GREATEST(1, CEIL((v_percentile_int::FLOAT / 100.0) * v_total_count));

    -- Get the value at this rank
    EXECUTE format('
      WITH all_values AS (
        SELECT %I AS value FROM driveline_seed_data
        WHERE %I IS NOT NULL
        AND ($1 = ''Overall'' OR playing_level = $1)

        UNION ALL

        SELECT %I AS value FROM athlete_percentile_contributions
        WHERE %I IS NOT NULL
        AND ($1 = ''Overall'' OR playing_level = $1)
      ),
      ranked_values AS (
        SELECT
          value,
          ROW_NUMBER() OVER (ORDER BY value) as rank
        FROM all_values
      )
      SELECT value
      FROM ranked_values
      WHERE rank = $2
      LIMIT 1
    ', p_metric_column, p_metric_column, p_metric_column, p_metric_column)
    INTO v_value
    USING p_play_level, v_target_rank;

    -- Insert threshold for this percentile
    IF v_value IS NOT NULL THEN
      INSERT INTO percentile_lookup (metric_column, play_level, value, percentile, total_count)
      VALUES (p_metric_column, p_play_level, ROUND(v_value::NUMERIC, 2), v_percentile_int, v_total_count);

      v_insert_count := v_insert_count + 1;
    END IF;
  END LOOP;

  RETURN v_insert_count;
END;
$func$;
  `;

  const { error: createError } = await supabase.rpc('exec_sql', {
    sql_query: newFunctionSQL
  });

  if (createError) {
    console.error('❌ Error creating function:', createError.message);
    return;
  }
  console.log('✅ Created new threshold-only function\n');

  console.log('✅ Migration applied successfully!\n');
  console.log('Now run: npx tsx scripts/populate-percentile-lookup-OPTIMIZED.ts\n');
}

main().catch(console.error);
