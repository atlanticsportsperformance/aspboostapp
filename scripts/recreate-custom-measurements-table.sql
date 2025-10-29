-- Drop the existing custom_measurements table
DROP TABLE IF EXISTS custom_measurements CASCADE;

-- Create simplified custom_measurements table
-- For single measurements: Use primary_metric_name and primary_metric_type only
-- For paired measurements: Use both primary_metric_* and secondary_metric_* fields
-- The "name" field is the display name (e.g., "Blue Ball (450g)")
-- The metric names (primary_metric_name, secondary_metric_name) serve as the unit (e.g., "Reps", "MPH")

CREATE TABLE custom_measurements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('single', 'paired')),

  -- Primary metric (used for ALL measurements)
  primary_metric_id TEXT,
  primary_metric_name TEXT,
  primary_metric_type TEXT CHECK (primary_metric_type IN ('integer', 'decimal', 'time')),

  -- Secondary metric (only for paired measurements)
  secondary_metric_id TEXT,
  secondary_metric_name TEXT,
  secondary_metric_type TEXT CHECK (secondary_metric_type IN ('integer', 'decimal', 'time')),

  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_custom_measurements_category ON custom_measurements(category);
CREATE INDEX idx_custom_measurements_locked ON custom_measurements(is_locked);

-- Enable RLS
ALTER TABLE custom_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read custom measurements
CREATE POLICY "Anyone can read custom measurements"
  ON custom_measurements
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create custom measurements
CREATE POLICY "Authenticated users can create custom measurements"
  ON custom_measurements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only allow deletion of non-locked measurements
CREATE POLICY "Can delete non-locked measurements"
  ON custom_measurements
  FOR DELETE
  USING (is_locked = false);

-- Policy: Can update non-locked measurements
CREATE POLICY "Can update non-locked measurements"
  ON custom_measurements
  FOR UPDATE
  USING (is_locked = false);
