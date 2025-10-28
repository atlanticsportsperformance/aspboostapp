'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Coach {
  id: string;
  coach_id: string;
  athlete_id: string;
  is_primary: boolean;
  coach: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AthleteCoachesSectionProps {
  athleteId: string;
}

export default function AthleteCoachesSection({ athleteId }: AthleteCoachesSectionProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchCoaches();
  }, [athleteId]);

  async function fetchCoaches() {
    const supabase = createClient();

    // Fetch assigned coaches
    const { data: coachesData, error } = await supabase
      .from('coach_athletes')
      .select(`
        id,
        coach_id,
        athlete_id,
        is_primary,
        coach:profiles!coach_athletes_coach_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('athlete_id', athleteId);

    if (error) {
      console.error('Error fetching coaches:', error);
    } else {
      setCoaches(coachesData || []);
    }

    setLoading(false);
  }

  async function fetchAllStaff() {
    const supabase = createClient();

    // Get all coaches
    const { data, error } = await supabase
      .from('staff')
      .select(`
        user_id,
        profile:user_id (
          first_name,
          last_name,
          email,
          app_role
        )
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff:', error);
    } else {
      // Filter to only coaches and admins
      const staffMembers = (data || []).filter(s =>
        s.profile?.app_role === 'coach' || s.profile?.app_role === 'admin'
      );
      setAllStaff(staffMembers);
    }
  }

  async function handleAssignCoach(coachId: string) {
    setAssigning(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('coach_athletes')
      .insert({
        coach_id: coachId,
        athlete_id: athleteId,
        assigned_by: user?.id || null,
        is_primary: coaches.length === 0 // First coach is primary by default
      });

    if (error) {
      console.error('Error assigning coach:', error);
      alert('Failed to assign coach');
    } else {
      await fetchCoaches();
      setShowAddCoach(false);
    }

    setAssigning(false);
  }

  async function handleRemoveCoach(assignmentId: string) {
    if (!confirm('Remove this coach assignment?')) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('coach_athletes')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing coach:', error);
      alert('Failed to remove coach');
    } else {
      await fetchCoaches();
    }
  }

  async function handleTogglePrimary(assignmentId: string, currentValue: boolean) {
    const supabase = createClient();

    // If setting as primary, remove primary from others first
    if (!currentValue) {
      await supabase
        .from('coach_athletes')
        .update({ is_primary: false })
        .eq('athlete_id', athleteId);
    }

    const { error } = await supabase
      .from('coach_athletes')
      .update({ is_primary: !currentValue })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error updating primary:', error);
      alert('Failed to update primary coach');
    } else {
      await fetchCoaches();
    }
  }

  const assignedCoachIds = coaches.map(c => c.coach_id);
  const availableStaff = allStaff.filter(s => !assignedCoachIds.includes(s.user_id));

  if (loading) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2 font-semibold">COACHES</p>
        <p className="text-xs text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 font-semibold">COACHES</p>
        <button
          onClick={() => {
            if (!showAddCoach) fetchAllStaff();
            setShowAddCoach(!showAddCoach);
          }}
          className="px-2 py-1 bg-[#9BDDFF]/10 hover:bg-[#9BDDFF]/20 text-[#9BDDFF] text-xs font-medium rounded transition-colors border border-[#9BDDFF]/20"
        >
          {showAddCoach ? 'Cancel' : '+ Add Coach'}
        </button>
      </div>

      {/* Assigned Coaches */}
      {coaches.length > 0 ? (
        <div className="space-y-2 mb-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold flex-shrink-0">
                  {coach.coach.first_name?.[0]}{coach.coach.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">
                    {coach.coach.first_name} {coach.coach.last_name}
                  </div>
                  {coach.is_primary && (
                    <span className="text-xs text-blue-400">Primary Coach</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePrimary(coach.id, coach.is_primary)}
                  className={`p-1.5 rounded transition-colors ${
                    coach.is_primary
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title={coach.is_primary ? 'Remove primary' : 'Set as primary'}
                >
                  {coach.is_primary ? '★' : '☆'}
                </button>
                <button
                  onClick={() => handleRemoveCoach(coach.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                  title="Remove coach"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-3">No coaches assigned</p>
      )}

      {/* Add Coach Dropdown */}
      {showAddCoach && (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg space-y-2 max-h-48 overflow-y-auto">
          {availableStaff.length === 0 ? (
            <p className="text-xs text-gray-500">All coaches have been assigned</p>
          ) : (
            availableStaff.map((staff) => (
              <div
                key={staff.user_id}
                className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold flex-shrink-0">
                    {staff.profile.first_name?.[0]}{staff.profile.last_name?.[0]}
                  </div>
                  <div className="text-xs text-white truncate">
                    {staff.profile.first_name} {staff.profile.last_name}
                  </div>
                </div>
                <button
                  onClick={() => handleAssignCoach(staff.user_id)}
                  disabled={assigning}
                  className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
