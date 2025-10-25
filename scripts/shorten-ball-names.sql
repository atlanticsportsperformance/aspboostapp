-- Shorten ball measurement names for better UI display
-- Remove "Ball" and change "Velocity" to "MPH"
-- Run this script in your Supabase SQL Editor

-- Update exercises to shorten measurement names in metric_schema
UPDATE exercises
SET metric_schema = jsonb_set(
  metric_schema,
  '{measurements}',
  (
    SELECT jsonb_agg(
      CASE
        -- Gray Ball measurements
        WHEN measurement->>'name' = 'Gray Ball (100g) Reps' THEN jsonb_set(measurement, '{name}', '"Gray (100g) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Gray Ball (100g) Velocity' THEN jsonb_set(measurement, '{name}', '"Gray (100g) MPH"'::jsonb)

        -- Yellow Ball measurements
        WHEN measurement->>'name' = 'Yellow Ball (150g) Reps' THEN jsonb_set(measurement, '{name}', '"Yellow (150g) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Yellow Ball (150g) Velocity' THEN jsonb_set(measurement, '{name}', '"Yellow (150g) MPH"'::jsonb)

        -- Red Ball measurements
        WHEN measurement->>'name' = 'Red Ball (225g) Reps' THEN jsonb_set(measurement, '{name}', '"Red (225g) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Red Ball (225g) Velocity' THEN jsonb_set(measurement, '{name}', '"Red (225g) MPH"'::jsonb)

        -- Blue Ball measurements
        WHEN measurement->>'name' = 'Blue Ball (450g) Reps' THEN jsonb_set(measurement, '{name}', '"Blue (450g) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Blue Ball (450g) Velocity' THEN jsonb_set(measurement, '{name}', '"Blue (450g) MPH"'::jsonb)

        -- Green Ball measurements
        WHEN measurement->>'name' = 'Green Ball (1000g) Reps' THEN jsonb_set(measurement, '{name}', '"Green (1000g) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Green Ball (1000g) Velocity' THEN jsonb_set(measurement, '{name}', '"Green (1000g) MPH"'::jsonb)

        -- Baseball measurements
        WHEN measurement->>'name' = 'Baseball (4oz) Reps' THEN jsonb_set(measurement, '{name}', '"Baseball (4oz) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Baseball (4oz) Velocity' THEN jsonb_set(measurement, '{name}', '"Baseball (4oz) MPH"'::jsonb)

        WHEN measurement->>'name' = 'Baseball (5oz) Reps' THEN jsonb_set(measurement, '{name}', '"Baseball (5oz) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Baseball (5oz) Velocity' THEN jsonb_set(measurement, '{name}', '"Baseball (5oz) MPH"'::jsonb)

        WHEN measurement->>'name' = 'Baseball (6oz) Reps' THEN jsonb_set(measurement, '{name}', '"Baseball (6oz) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Baseball (6oz) Velocity' THEN jsonb_set(measurement, '{name}', '"Baseball (6oz) MPH"'::jsonb)

        WHEN measurement->>'name' = 'Baseball (7oz) Reps' THEN jsonb_set(measurement, '{name}', '"Baseball (7oz) Reps"'::jsonb)
        WHEN measurement->>'name' = 'Baseball (7oz) Velocity' THEN jsonb_set(measurement, '{name}', '"Baseball (7oz) MPH"'::jsonb)

        ELSE measurement
      END
    )
    FROM jsonb_array_elements(metric_schema->'measurements') AS measurement
  )
)
WHERE category = 'throwing'
  AND metric_schema->'measurements' IS NOT NULL;

-- Verify the changes
SELECT
  name,
  (
    SELECT string_agg(measurement->>'name', ', ' ORDER BY measurement->>'name')
    FROM jsonb_array_elements(metric_schema->'measurements') AS measurement
  ) as measurement_names
FROM exercises
WHERE category = 'throwing'
  AND metric_schema->'measurements' IS NOT NULL
LIMIT 5;
