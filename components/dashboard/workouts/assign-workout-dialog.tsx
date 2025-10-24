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
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, athlete: '' });
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch athletes - try both foreign key patterns to handle different schemas
    let athletesData;

    // First try profile_id foreign key
    const { data: athletesData1, error: error1 } = await supabase
      .from('athletes')
      .select(`
        id,
        profiles:profile_id (
          first_name,
          last_name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error1 && athletesData1) {
      athletesData = athletesData1;
    } else {
      // Fallback to user_id foreign key
      const { data: athletesData2 } = await supabase
        .from('athletes')
        .select(`
          id,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      athletesData = athletesData2;
    }

    if (athletesData) {
      setAthletes(athletesData);
    }

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (teamsData) {
      setTeams(teamsData);
    }

    setLoading(false);
  }

  async function handleAssign() {
    if (assignType === 'athlete' && selectedAthletes.length === 0) {
      alert('Please select at least one athlete');
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

    let athleteIds = selectedAthletes;

    // If team mode, get all team members
    if (assignType === 'team' && selectedTeam) {
      const { data: members } = await supabase
        .from('team_members')
        .select('athlete_id')
        .eq('team_id', selectedTeam)
        .eq('status', 'active');

      athleteIds = members?.map(m => m.athlete_id) || [];
    }

    setProgress({ current: 0, total: athleteIds.length, athlete: '' });

    // Assign to each athlete
    for (let i = 0; i < athleteIds.length; i++) {
      const athleteId = athleteIds[i];
      const athlete = athletes.find(a => a.id === athleteId);
      const athleteName = athlete?.profiles
        ? `${athlete.profiles.first_name} ${athlete.profiles.last_name}`
        : 'Unknown';

      setProgress({
        current: i + 1,
        total: athleteIds.length,
        athlete: athleteName
      });

      await assignToAthlete(athleteId);
    }

    alert(`Workout assigned to ${athleteIds.length} athlete${athleteIds.length !== 1 ? 's' : ''}!`);
    setSubmitting(false);
    onClose();
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
      throw error;
    }

    console.log('Workout assigned:', data);
  }

  // Filter athletes based on search query
  const filteredAthletes = athletes.filter(athlete => {
    if (!searchQuery) return true;
    const fullName = `${athlete.profiles?.first_name || ''} ${athlete.profiles?.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const canAssign = assignType === 'athlete'
    ? selectedAthletes.length > 0
    : selectedTeam !== '';

  // Select all / deselect all helpers
  const toggleSelectAll = () => {
    if (selectedAthletes.length === filteredAthletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(filteredAthletes.map(a => a.id));
    }
  };

  const allSelected = filteredAthletes.length > 0 && selectedAthletes.length === filteredAthletes.length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <div className="text-center text-neutral-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-white">Assign Workout to Athletes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!submitting ? (
            <>
          <div>
            <div className="text-gray-400 text-sm mb-1">Workout</div>
            <div className="text-white font-medium">{workout.name}</div>
            {workout.is_template && (
              <div className="mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 text-sm">
                📋 This is a template workout. Any placeholders will need to be filled by the coach after assignment.
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
                <span className="text-white">Athletes</span>
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
                <span className="text-white">Team</span>
              </label>
            </div>
          </div>

          {assignType === 'athlete' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-400">
                  Select Athletes ({selectedAthletes.length} of {athletes.length} selected)
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search Box */}
              <input
                type="text"
                placeholder="Search athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 mb-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />

              <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg p-3 space-y-2">
                {filteredAthletes.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    {athletes.length === 0 ? 'No athletes found' : 'No athletes match your search'}
                  </div>
                ) : (
                  filteredAthletes.map(athlete => (
                    <label
                      key={athlete.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAthletes.includes(athlete.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAthletes([...selectedAthletes, athlete.id]);
                          } else {
                            setSelectedAthletes(
                              selectedAthletes.filter(id => id !== athlete.id)
                            );
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-white">
                        {athlete.profiles?.first_name} {athlete.profiles?.last_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white [&>option]:bg-gray-900"
              >
                <option value="">Choose a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Scheduled Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              ℹ️ This will create independent workout copies for each athlete.
              Coaches can edit these workouts without affecting the template or other athletes.
            </p>
          </div>
            </>
          ) : (
            <div className="py-8">
              <div className="text-center mb-4">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-lg font-semibold mb-2">
                  Assigning to {progress.athlete}...
                </p>
                <p className="text-gray-400">
                  {progress.current} of {progress.total} athletes
                </p>
              </div>

              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitting && (
          <div className="flex gap-3 px-6 py-4 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!canAssign}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Assign to {assignType === 'athlete'
                ? `${selectedAthletes.length} Athlete${selectedAthletes.length !== 1 ? 's' : ''}`
                : 'Team'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
