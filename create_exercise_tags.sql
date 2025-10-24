-- Create exercise_tags table
CREATE TABLE IF NOT EXISTS exercise_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the existing exercise tags
INSERT INTO exercise_tags (name) VALUES 
  ('hitting'),
  ('mobility'),
  ('pitching'),
  ('placeholder'),
  ('strength'),
  ('throwing')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read exercise tags
CREATE POLICY "Authenticated users can read exercise tags"
ON exercise_tags
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy to allow all authenticated users to manage exercise tags
CREATE POLICY "Authenticated users can manage exercise tags"
ON exercise_tags
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
