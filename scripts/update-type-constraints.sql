-- Drop existing type constraints
ALTER TABLE custom_measurements DROP CONSTRAINT IF EXISTS custom_measurements_primary_metric_type_check;
ALTER TABLE custom_measurements DROP CONSTRAINT IF EXISTS custom_measurements_secondary_metric_type_check;

-- Add new simplified type constraints
ALTER TABLE custom_measurements ADD CONSTRAINT custom_measurements_primary_metric_type_check
  CHECK (primary_metric_type IN ('integer', 'decimal', 'time'));

ALTER TABLE custom_measurements ADD CONSTRAINT custom_measurements_secondary_metric_type_check
  CHECK (secondary_metric_type IN ('integer', 'decimal', 'time'));
