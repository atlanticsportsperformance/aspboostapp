// Database types matching Supabase schema
// These will be auto-generated later, but we define core ones manually for now

export type AppRole = 'athlete' | 'coach' | 'admin' | 'super_admin';
export type StaffRole = 'owner' | 'admin' | 'coach' | 'intern';
export type ExerciseCategory = 
  | 'strength' 
  | 'hitting' 
  | 'pitching' 
  | 'throwing' 
  | 'mobility' 
  | 'conditioning' 
  | 'recovery' 
  | 'assessment';

export type CompletionStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Core database table types
export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  app_role: AppRole;
  phone: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string;
  user_id: string | null;
  org_id: string | null;
  date_of_birth: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  dominant_hand: 'left' | 'right' | 'switch' | null;
  primary_position: string | null;
  secondary_position: string | null;
  grad_year: number | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string | null;
  video_url: string | null;
  cues: string[] | null;
  equipment: string[] | null;
  metric_schema: any; // JSON
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutInstance {
  id: string;
  assignment_id: string;
  workout_id: string;
  athlete_id: string;
  scheduled_date: string;
  status: CompletionStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  total_weeks: number;
  is_template: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Add more types as needed during development