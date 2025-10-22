'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Workout {
  id: string;
  name: string;
  is_template: boolean;
}

interface Athlete {
  id: string;
  user_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Team {
  id: string;
  name: string;
}

interface AssignWorkoutDialogProps {
  workout: Workout;
  onClose: () => void;
}

export function AssignWorkoutDialog({ workout, onClose }: AssignWorkoutDialogProps) {
  const [assignType, setAssignType] = useState<'athlete' | 'team'>('athlete');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch athletes
    const { data: athletesData } = await supabase
      .from('athletes')
      .select(`
        id,
        user_id,
        profiles!athletes_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (athletesData) {
      setAthletes(athletesData);
      if (athletesData.length > 0) {
        setSelectedAthlete(athletesData[0].id);
      }
    }

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (teamsData) {
      setTeams(teamsData);
      if (teamsData.length > 0) {
        setSelectedTeam(teamsData[0].id);
      }
    }

    setLoading(false);
  }

  async function handleAssign() {
    if (assignType === 'athlete' && !selectedAthlete) {
      alert('Please select an athlete');
      return;
    }

    if (assignType === 'team' && !selectedTeam) {
      alert('Please select a team');
      return;
    }

    if (!scheduledDate) {
      alert('Please select a date');
      return;
    }

    setSubmitting(true);

    if (assignType === 'athlete') {
      await assignToAthlete(selectedAthlete);
    } else {
      await assignToTeam(selectedTeam);
    }

    setSubmitting(false);
  }

  async function assignToAthlete(athleteId: string) {
    const { data, error } = await supabase
      .from('workout_instances')
      .insert({
        workout_id: workout.id,
        athlete_id: athleteId,
        scheduled_date: scheduledDate,
        status: 'not_started',
        placeholder_resolutions: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning workout:', error);
      alert('Failed to assign workout');
      return;
    }

    console.log('Workout assigned:', data);

    if (workout.is_template) {
      alert('Workout assigned! The athlete will need to select exercises for the placeholders.');
    } else {
      alert('Workout assigned successfully!');
    }

    onClose();
  }

  async function assignToTeam(teamId: string) {
    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('athlete_id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      alert('Failed to fetch team members');
      return;
    }

    if (!members || members.length === 0) {
      alert('No active athletes in this team');
      return;
    }

    // Create workout instances for all team members
    const instances = members.map((m) => ({
      workout_id: workout.id,
      athlete_id: m.athlete_id,
      scheduled_date: scheduledDate,
      status: 'not_started',
      placeholder_resolutions: {}
    }));

    const { error } = await supabase
      .from('workout_instances')
      .insert(instances);

    if (error) {
      console.error('Error assigning workout to team:', error);
      alert('Failed to assign workout to team');
      return;
    }

    console.log(`Workout assigned to ${instances.length} athletes`);

    if (workout.is_template) {
      alert(`Workout assigned to ${instances.length} athletes! Each athlete will need to select exercises for the placeholders.`);
    } else {
      alert(`Workout assigned to ${instances.length} athletes successfully!`);
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Assign Workout</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Workout</div>
            <div className="text-white font-medium">{workout.name}</div>
            {workout.is_template && (
              <div className="mt-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded text-purple-300 text-sm">
                ⚠️ This is a template workout with placeholders. Exercises will need to be selected after assignment.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Assign to</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  value="athlete"
                  checked={assignType === 'athlete'}
                  onChange={() => setAssignType('athlete')}
                  className="w-4 h-4"
                />
                <span className="text-white">Single Athlete</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  value="team"
                  checked={assignType === 'team'}
                  onChange={() => setAssignType('team')}
                  className="w-4 h-4"
                />
                <span className="text-white">Team/Group</span>
              </label>
            </div>
          </div>

          {assignType === 'athlete' ? (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Athlete</label>
              {loading ? (
                <div className="text-gray-400 text-sm">Loading athletes...</div>
              ) : athletes.length === 0 ? (
                <div className="text-gray-400 text-sm">No athletes found</div>
              ) : (
                <select
                  value={selectedAthlete}
                  onChange={(e) => setSelectedAthlete(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.profiles?.first_name} {athlete.profiles?.last_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Team</label>
              {loading ? (
                <div className="text-gray-400 text-sm">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="text-gray-400 text-sm">No teams found</div>
              ) : (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={submitting || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
          >
            {submitting ? 'Assigning...' : 'Assign Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
