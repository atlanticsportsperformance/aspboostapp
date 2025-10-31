-- Add missing composite score columns to athlete_percentile_history

-- Add composite_score_level (percentile for this specific play level)
ALTER TABLE athlete_percentile_history
ADD COLUMN IF NOT EXISTS composite_score_level double precision;

-- Add composite_score_overall (percentile across all play levels)
ALTER TABLE athlete_percentile_history
ADD COLUMN IF NOT EXISTS composite_score_overall double precision;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athlete_percentile_history'
  AND column_name LIKE '%composite%';

SELECT '✅ Composite score columns added to athlete_percentile_history' AS status;
