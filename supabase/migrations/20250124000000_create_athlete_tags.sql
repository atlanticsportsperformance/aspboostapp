-- Create athlete_tags table to store tag assignments for athletes
CREATE TABLE IF NOT EXISTS athlete_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('plan', 'workout', 'exercise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, tag_name, tag_type)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_athlete_tags_athlete_id ON athlete_tags(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_tags_tag_name ON athlete_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_athlete_tags_tag_type ON athlete_tags(tag_type);

-- Enable RLS
ALTER TABLE athlete_tags ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage tags for their athletes
CREATE POLICY "Users can manage tags for their athletes"
ON athlete_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM athletes
    WHERE athletes.id = athlete_tags.athlete_id
    AND athletes.coach_id = auth.uid()
  )
);
