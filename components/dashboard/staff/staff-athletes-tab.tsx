'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCoachAthletes } from '@/lib/auth/use-coach-athletes';

interface StaffAthletesTabProps {
  coach: {
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function StaffAthletesTab({ coach }: StaffAthletesTabProps) {
  const { assignments, athleteIds, loading, assignAthlete, unassignAthlete, updateAssignment } = useCoachAthletes(coach.user_id);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchAllAthletes();
  }, []);

  async function fetchAllAthletes() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, email')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching athletes:', error);
    } else {
      setAllAthletes(data || []);
    }

    setLoadingAthletes(false);
  }

  async function handleAssign(athleteId: string) {
    setAssigning(true);
    const result = await assignAthlete(athleteId);
    setAssigning(false);

    if (result.error) {
      alert(`Failed to assign athlete: ${result.error}`);
    }
  }

  async function handleUnassign(athleteId: string) {
    if (!confirm('Remove this athlete assignment?')) return;

    const result = await unassignAthlete(athleteId);

    if (result.error) {
      alert(`Failed to unassign athlete: ${result.error}`);
    }
  }

  async function handleTogglePrimary(athleteId: string, currentValue: boolean) {
    const result = await updateAssignment(athleteId, { is_primary: !currentValue });

    if (result.error) {
      alert(`Failed to update primary status: ${result.error}`);
    }
  }

  // Filter available athletes (not yet assigned)
  const availableAthletes = allAthletes.filter(a => !athleteIds.includes(a.id));

  // Filter by search
  const filteredAvailable = availableAthletes.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(query) ||
      a.last_name.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-white mb-6">Assigned Athletes</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Athletes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Currently Assigned ({assignments.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No athletes assigned yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-sm font-semibold flex-shrink-0">
                      {assignment.athlete?.first_name?.[0]}{assignment.athlete?.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">
                        {assignment.athlete?.first_name} {assignment.athlete?.last_name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{assignment.athlete?.email}</div>
                      {assignment.is_primary && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePrimary(assignment.athlete_id, assignment.is_primary)}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-sm font-medium transition-colors whitespace-nowrap"
                      title={assignment.is_primary ? 'Remove primary' : 'Set as primary'}
                    >
                      {assignment.is_primary ? '★' : '☆'}
                    </button>
                    <button
                      onClick={() => handleUnassign(assignment.athlete_id)}
                      className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                      title="Remove assignment"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Athletes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Available Athletes ({availableAthletes.length})
          </h3>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search athletes..."
            className="w-full px-4 py-2 mb-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {loadingAthletes ? (
            <div className="text-center py-8 text-gray-400">Loading athletes...</div>
          ) : filteredAvailable.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? 'No athletes match your search' : 'All athletes have been assigned'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filteredAvailable.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-sm font-semibold flex-shrink-0">
                      {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">
                        {athlete.first_name} {athlete.last_name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{athlete.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(athlete.id)}
                    disabled={assigning}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
