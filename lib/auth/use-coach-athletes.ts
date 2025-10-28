import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CoachAthlete {
  id: string;
  coach_id: string;
  athlete_id: string;
  assigned_by: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/**
 * React hook to fetch athletes assigned to a coach
 */
export function useCoachAthletes(coachId: string | null) {
  const [assignments, setAssignments] = useState<CoachAthlete[]>([]);
  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coachId) {
      setAssignments([]);
      setAthleteIds([]);
      setLoading(false);
      return;
    }

    async function fetchCoachAthletes() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('coach_athletes')
        .select(`
          *,
          athlete:athlete_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching coach athletes:', fetchError);
        setError(fetchError.message);
        setAssignments([]);
        setAthleteIds([]);
      } else {
        setAssignments(data || []);
        setAthleteIds((data || []).map(a => a.athlete_id));
      }

      setLoading(false);
    }

    fetchCoachAthletes();
  }, [coachId]);

  async function assignAthlete(athleteId: string, isPrimary: boolean = false, notes: string | null = null) {
    if (!coachId) return { error: 'No coach ID provided' };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('coach_athletes')
      .insert({
        coach_id: coachId,
        athlete_id: athleteId,
        is_primary: isPrimary,
        notes: notes,
        assigned_by: user?.id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning athlete:', error);
      return { error: error.message };
    }

    // Refresh the list
    setAssignments([...assignments, data]);
    setAthleteIds([...athleteIds, athleteId]);

    return { data };
  }

  async function unassignAthlete(athleteId: string) {
    if (!coachId) return { error: 'No coach ID provided' };

    const supabase = createClient();
    const { error } = await supabase
      .from('coach_athletes')
      .delete()
      .eq('coach_id', coachId)
      .eq('athlete_id', athleteId);

    if (error) {
      console.error('Error unassigning athlete:', error);
      return { error: error.message };
    }

    // Refresh the list
    setAssignments(assignments.filter(a => a.athlete_id !== athleteId));
    setAthleteIds(athleteIds.filter(id => id !== athleteId));

    return { success: true };
  }

  async function updateAssignment(athleteId: string, updates: { is_primary?: boolean; notes?: string }) {
    if (!coachId) return { error: 'No coach ID provided' };

    const supabase = createClient();
    const { error } = await supabase
      .from('coach_athletes')
      .update(updates)
      .eq('coach_id', coachId)
      .eq('athlete_id', athleteId);

    if (error) {
      console.error('Error updating assignment:', error);
      return { error: error.message };
    }

    // Refresh the list
    setAssignments(assignments.map(a =>
      a.athlete_id === athleteId ? { ...a, ...updates } : a
    ));

    return { success: true };
  }

  return {
    assignments,
    athleteIds,
    loading,
    error,
    assignAthlete,
    unassignAthlete,
    updateAssignment
  };
}
