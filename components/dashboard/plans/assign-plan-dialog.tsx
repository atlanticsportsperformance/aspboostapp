'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AssignPlanDialogProps {
  plan: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignPlanDialog({ plan, onClose, onSuccess }: AssignPlanDialogProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<'athletes' | 'team'>('athletes');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assigning, setAssigning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, athlete: '' });

  useEffect(() => {
    fetchAthletes();
    fetchTeams();
  }, []);

  async function fetchAthletes() {
    // Try both foreign key patterns to handle different schemas
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
      .order('created_at');

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
        .order('created_at');

      athletesData = athletesData2;
    }

    console.log('Athletes loaded:', athletesData);
    setAthletes(athletesData || []);
  }

  async function fetchTeams() {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('name');

    console.log('Teams loaded:', data);
    setTeams(data || []);
  }

  async function handleAssign() {
    setAssigning(true);

    let athleteIds = selectedAthletes;

    // If team mode, get all team members
    if (mode === 'team' && selectedTeam) {
      const { data: members } = await supabase
        .from('team_members')
        .select('athlete_id')
        .eq('team_id', selectedTeam)
        .eq('status', 'active');

      athleteIds = members?.map(m => m.athlete_id) || [];
      console.log('Team members:', athleteIds.length);
    }

    // Set progress total
    setProgress({ current: 0, total: athleteIds.length, athlete: '' });

    // Assign to each athlete
    for (let i = 0; i < athleteIds.length; i++) {
      const athleteId = athleteIds[i];
      const athlete = athletes.find(a => a.id === athleteId);
      const athleteName = athlete?.profiles ?
        `${athlete.profiles.first_name} ${athlete.profiles.last_name}` :
        'Unknown';

      setProgress({
        current: i + 1,
        total: athleteIds.length,
        athlete: athleteName
      });

      console.log(`Assigning to ${athleteName} (${i + 1}/${athleteIds.length})`);

      await assignPlanToAthlete(plan.id, athleteId, startDate);
    }

    console.log(`✅ Plan assigned to ${athleteIds.length} athletes`);
    setAssigning(false);
    if (onSuccess) onSuccess();
    onClose();
  }

  async function assignPlanToAthlete(
    planId: string,
    athleteId: string,
    startDate: string
  ) {
    console.log(`Starting assignment: plan=${planId}, athlete=${athleteId}, start=${startDate}`);

    // 1. Get all workouts in the plan via program_days
    const { data: programDays, error: programError } = await supabase
      .from('program_days')
      .select(`
        week_number,
        day_number,
        workouts (
          *,
          routines (
            *,
            routine_exercises (*)
          )
        )
      `)
      .eq('plan_id', planId)
      .order('week_number')
      .order('day_number');

    if (programError) {
      console.error('Error fetching program days:', programError);
      throw programError;
    }

    console.log(`Found ${programDays?.length || 0} program days`);

    if (!programDays || programDays.length === 0) {
      console.warn('No workouts found in plan');
      return;
    }

    // 2. For each program day, deep copy workout to athlete
    for (const programDay of programDays) {
      const planWorkout = programDay.workouts;

      if (!planWorkout) {
        console.warn(`No workout for week ${programDay.week_number}, day ${programDay.day_number}`);
        continue;
      }

      // Calculate scheduled date
      const scheduledDate = calculateScheduledDate(
        startDate,
        programDay.week_number,
        programDay.day_number
      );

      console.log(`Week ${programDay.week_number}, Day ${programDay.day_number} → ${scheduledDate}`);

      // 3. Create athlete-owned copy of workout
      const { data: athleteWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: planWorkout.name,
          estimated_duration_minutes: planWorkout.estimated_duration_minutes,
          notes: planWorkout.notes,
          tags: planWorkout.tags,
          category: planWorkout.category,
          is_template: false,              // NOT a template
          plan_id: null,                   // Athlete workouts don't belong to plans
          athlete_id: athleteId,           // ATHLETE OWNS THIS
          source_workout_id: planWorkout.id, // Track where it came from (this preserves the plan lineage)
          placeholder_definitions: planWorkout.placeholder_definitions || { placeholders: [] }
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating athlete workout:', workoutError);
        console.error('Workout data that failed:', {
          name: planWorkout.name,
          estimated_duration_minutes: planWorkout.estimated_duration_minutes,
          notes: planWorkout.notes,
          tags: planWorkout.tags,
          category: planWorkout.category,
          is_template: false,
          plan_id: planId,
          athlete_id: athleteId,
          source_workout_id: planWorkout.id
        });
        alert(`Failed to create workout: ${workoutError.message || JSON.stringify(workoutError)}`);
        throw workoutError;
      }

      console.log(`✅ Created athlete workout: ${athleteWorkout.id}`);

      // 4. Copy all routines
      for (const planRoutine of planWorkout.routines || []) {
        const { data: athleteRoutine, error: routineError } = await supabase
          .from('routines')
          .insert({
            workout_id: athleteWorkout.id,
            name: planRoutine.name,
            scheme: planRoutine.scheme,
            order_index: planRoutine.order_index,
            rest_between_rounds_seconds: planRoutine.rest_between_rounds_seconds,
            notes: planRoutine.notes,
            superset_block_name: planRoutine.superset_block_name,
            is_standalone: false,
            plan_id: null,                      // Athlete routines don't belong to plans
            athlete_id: athleteId,              // ATHLETE OWNS THIS
            source_routine_id: planRoutine.id   // Track where it came from (preserves plan lineage)
          })
          .select()
          .single();

        if (routineError) {
          console.error('Error creating athlete routine:', routineError);
          throw routineError;
        }

        console.log(`✅ Created athlete routine: ${athleteRoutine.id}`);

        // 5. Copy all exercises
        const exercises = (planRoutine.routine_exercises || []).map((ex: any) => ({
          routine_id: athleteRoutine.id,
          exercise_id: ex.exercise_id,
          is_placeholder: ex.is_placeholder,
          placeholder_name: ex.placeholder_name,
          order_index: ex.order_index,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          metric_targets: ex.metric_targets,
          intensity_targets: ex.intensity_targets,
          set_configurations: ex.set_configurations,
          enabled_measurements: ex.enabled_measurements,
          tracked_max_metrics: ex.tracked_max_metrics,
          is_amrap: ex.is_amrap
        }));

        if (exercises.length > 0) {
          const { error: exercisesError } = await supabase
            .from('routine_exercises')
            .insert(exercises);

          if (exercisesError) {
            console.error('Error creating routine exercises:', exercisesError);
            throw exercisesError;
          }

          console.log(`✅ Created ${exercises.length} routine exercises`);
        }
      }

      // 6. Create workout instance (scheduled workout)
      const { error: instanceError } = await supabase
        .from('workout_instances')
        .insert({
          workout_id: athleteWorkout.id,
          athlete_id: athleteId,
          scheduled_date: scheduledDate,
          status: 'not_started'
        });

      if (instanceError) {
        console.error('Error creating workout instance:', instanceError);
        throw instanceError;
      }

      console.log(`✅ Created workout instance for ${scheduledDate}`);
    }

    console.log(`✅ Completed assignment for athlete ${athleteId}`);
  }

  function calculateScheduledDate(
    startDate: string,
    weekNumber: number,
    dayNumber: number
  ): string {
    const start = new Date(startDate);

    // Add weeks (week 1 = start, week 2 = +7 days, etc.)
    const weeksToAdd = weekNumber - 1;
    start.setDate(start.getDate() + (weeksToAdd * 7));

    // Add days (day 1 = start of week, day 2 = +1 day, etc.)
    const daysToAdd = dayNumber - 1;
    start.setDate(start.getDate() + daysToAdd);

    return start.toISOString().split('T')[0];
  }

  // Filter athletes based on search query
  const filteredAthletes = athletes.filter(athlete => {
    if (!searchQuery) return true;
    const fullName = `${athlete.profiles?.first_name || ''} ${athlete.profiles?.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const canAssign = mode === 'athletes'
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white">Assign Plan to Athletes</h2>
            <p className="text-sm text-gray-400 mt-1">
              {plan.name} • {plan.program_length_weeks} weeks
            </p>
          </div>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!assigning ? (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">Assign To:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'athletes'}
                      onChange={() => setMode('athletes')}
                      className="w-4 h-4"
                    />
                    <span>Individual Athletes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'team'}
                      onChange={() => setMode('team')}
                      className="w-4 h-4"
                    />
                    <span>Team</span>
                  </label>
                </div>
              </div>

              {/* Athletes Selection */}
              {mode === 'athletes' && (
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
              )}

              {/* Team Selection */}
              {mode === 'team' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Select Team:
                  </label>
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

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Start Date:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Week 1, Day 1 will be scheduled for this date
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  ℹ️ This will create independent workout copies for each athlete.
                  Coaches can edit these workouts without affecting the plan or other athletes.
                </p>
              </div>
            </div>
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
        {!assigning && (
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
              Assign to {mode === 'athletes'
                ? `${selectedAthletes.length} Athlete${selectedAthletes.length !== 1 ? 's' : ''}`
                : 'Team'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
