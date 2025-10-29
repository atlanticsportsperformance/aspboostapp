-- Fix RLS policies for athlete_view_types table
-- The issue is that the policies might be too restrictive

-- First, let's drop the existing policies
DROP POLICY IF EXISTS "Users can read view types from their org" ON athlete_view_types;
DROP POLICY IF EXISTS "Admins can manage view types" ON athlete_view_types;

-- Create a simpler read policy that allows anyone authenticated to read view types
CREATE POLICY "Allow authenticated users to read view types"
ON athlete_view_types FOR SELECT
TO authenticated
USING (true);

-- Create a policy for admins to manage (insert, update, delete)
CREATE POLICY "Allow admins to manage view types"
ON athlete_view_types FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role IN ('admin', 'super_admin')
  )
);

-- Verify RLS is enabled
ALTER TABLE athlete_view_types ENABLE ROW LEVEL SECURITY;
