-- Check if athlete_tags table exists and its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'athlete_tags';

-- If it doesn't exist, create it with correct structure
CREATE TABLE IF NOT EXISTS athlete_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('plan', 'workout', 'exercise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, tag_name, tag_type)
);
