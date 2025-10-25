-- =============================================
-- GROUPS MANAGEMENT SYSTEM
-- =============================================
-- This migration creates the groups system that allows:
-- 1. Creating groups of athletes
-- 2. Managing group calendars with scheduled workouts
-- 3. Automatically assigning group workouts to all group members
-- 4. Tracking group membership and permissions
-- =============================================

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6', -- Default blue color for calendar display
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'member', 'leader', 'captain'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, athlete_id)
);

-- Create group_workout_schedules table
-- This stores workouts scheduled on the group calendar
CREATE TABLE IF NOT EXISTS group_workout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  notes TEXT,
  auto_assign BOOLEAN DEFAULT true, -- Automatically assign to all group members
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group_tags table for categorizing groups
CREATE TABLE IF NOT EXISTS group_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, tag)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_athlete_id ON group_members(athlete_id);
CREATE INDEX IF NOT EXISTS idx_group_workout_schedules_group_id ON group_workout_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_group_workout_schedules_date ON group_workout_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_group_workout_schedules_group_date ON group_workout_schedules(group_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_group_tags_group_id ON group_tags(group_id);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_workout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Users can view groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own groups" ON groups
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for group_members
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "Group creators can add members" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can update members" ON group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for group_workout_schedules
CREATE POLICY "Users can view group workout schedules" ON group_workout_schedules
  FOR SELECT USING (true);

CREATE POLICY "Users can create group workout schedules" ON group_workout_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update group workout schedules" ON group_workout_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete group workout schedules" ON group_workout_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for group_tags
CREATE POLICY "Users can view group tags" ON group_tags
  FOR SELECT USING (true);

CREATE POLICY "Group creators can manage tags" ON group_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Create function to auto-assign group workouts to members
CREATE OR REPLACE FUNCTION assign_group_workout_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if auto_assign is true
  IF NEW.auto_assign THEN
    -- Insert workout instances for all group members
    INSERT INTO workout_instances (athlete_id, workout_id, scheduled_date, status, source_type, source_id)
    SELECT
      gm.athlete_id,
      NEW.workout_id,
      NEW.scheduled_date,
      'scheduled',
      'group',
      NEW.id
    FROM group_members gm
    WHERE gm.group_id = NEW.group_id
    ON CONFLICT (athlete_id, workout_id, scheduled_date) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign workouts when scheduled on group calendar
CREATE TRIGGER trigger_assign_group_workout
  AFTER INSERT ON group_workout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION assign_group_workout_to_members();

-- Create function to assign workout to new group member
CREATE OR REPLACE FUNCTION assign_existing_group_workouts_to_new_member()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new member joins, assign all future group workouts to them
  INSERT INTO workout_instances (athlete_id, workout_id, scheduled_date, status, source_type, source_id)
  SELECT
    NEW.athlete_id,
    gws.workout_id,
    gws.scheduled_date,
    'scheduled',
    'group',
    gws.id
  FROM group_workout_schedules gws
  WHERE gws.group_id = NEW.group_id
    AND gws.auto_assign = true
    AND gws.scheduled_date >= CURRENT_DATE
  ON CONFLICT (athlete_id, workout_id, scheduled_date) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign existing workouts to new members
CREATE TRIGGER trigger_assign_workouts_to_new_member
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION assign_existing_group_workouts_to_new_member();

-- Add source tracking to workout_instances if columns don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_instances' AND column_name = 'source_type') THEN
    ALTER TABLE workout_instances ADD COLUMN source_type TEXT; -- 'manual', 'plan', 'group', 'routine'
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_instances' AND column_name = 'source_id') THEN
    ALTER TABLE workout_instances ADD COLUMN source_id UUID; -- Reference to source (group_workout_schedule.id, plan.id, etc)
  END IF;
END $$;

-- Create index on source fields
CREATE INDEX IF NOT EXISTS idx_workout_instances_source ON workout_instances(source_type, source_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_workout_schedules_updated_at BEFORE UPDATE ON group_workout_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE groups IS 'Stores groups of athletes for collective scheduling and management';
COMMENT ON TABLE group_members IS 'Junction table linking athletes to groups';
COMMENT ON TABLE group_workout_schedules IS 'Workouts scheduled on group calendars that auto-assign to all members';
COMMENT ON TABLE group_tags IS 'Tags for categorizing and filtering groups';
COMMENT ON COLUMN group_workout_schedules.auto_assign IS 'When true, automatically creates workout_instances for all group members';
COMMENT ON COLUMN workout_instances.source_type IS 'Origin of workout assignment: manual, plan, group, or routine';
COMMENT ON COLUMN workout_instances.source_id IS 'UUID reference to the source record (e.g., group_workout_schedule.id)';
