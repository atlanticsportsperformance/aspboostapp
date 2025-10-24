-- Drop the table if it exists with wrong structure
DROP TABLE IF EXISTS athlete_tags CASCADE;

-- Create athlete_tags table with correct structure
CREATE TABLE athlete_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('plan', 'workout', 'exercise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, tag_name, tag_type)
);

-- Add indexes
CREATE INDEX idx_athlete_tags_athlete_id ON athlete_tags(athlete_id);
CREATE INDEX idx_athlete_tags_tag_name ON athlete_tags(tag_name);
CREATE INDEX idx_athlete_tags_tag_type ON athlete_tags(tag_type);

-- Enable RLS
ALTER TABLE athlete_tags ENABLE ROW LEVEL SECURITY;

-- Create a simpler policy that allows authenticated users to manage all tags
CREATE POLICY "Authenticated users can manage athlete tags"
ON athlete_tags
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
