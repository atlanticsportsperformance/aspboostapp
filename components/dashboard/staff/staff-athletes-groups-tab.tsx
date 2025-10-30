'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCoachAthletes } from '@/lib/auth/use-coach-athletes';
import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';

interface StaffAthletesGroupsTabProps {
  staffMember: {
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
      app_role: 'admin' | 'coach' | 'athlete';
    };
  };
}

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  member_count?: number;
}

interface StaffGroup {
  id: string;
  role: string;
  group_id: string;
  group?: Group;
}

export default function StaffAthletesGroupsTab({ staffMember }: StaffAthletesGroupsTabProps) {
  const isCoach = staffMember.profile.app_role === 'coach';

  // Athletes state (only for coaches)
  const { assignments, athleteIds, loading: loadingAthletes, assignAthlete, unassignAthlete, updateAssignment } = useCoachAthletes(staffMember.user_id);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [loadingAllAthletes, setLoadingAllAthletes] = useState(true);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');
  const [assigningAthlete, setAssigningAthlete] = useState(false);

  // Groups state (for all staff)
  const [groupAssignments, setGroupAssignments] = useState<StaffGroup[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingAllGroups, setLoadingAllGroups] = useState(true);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [assigningGroup, setAssigningGroup] = useState(false);

  // View toggle
  const [showAthleteAssign, setShowAthleteAssign] = useState(false);
  const [showGroupAssign, setShowGroupAssign] = useState(false);

  useEffect(() => {
    if (isCoach) {
      fetchAllAthletes();
    }
    fetchGroupAssignments();
    fetchAllGroups();
  }, [staffMember.user_id]);

  // Athletes functions
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
    setLoadingAllAthletes(false);
  }

  async function handleAssignAthlete(athleteId: string) {
    setAssigningAthlete(true);
    const result = await assignAthlete(athleteId);
    setAssigningAthlete(false);

    if (result.error) {
      alert(`Failed to assign athlete: ${result.error}`);
    } else {
      setShowAthleteAssign(false);
    }
  }

  async function handleUnassignAthlete(athleteId: string) {
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

  // Groups functions
  async function fetchGroupAssignments() {
    const supabase = createClient();
    const { data: staffGroupsData, error } = await supabase
      .from('staff_groups')
      .select('*')
      .eq('staff_id', staffMember.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff groups:', error);
      setLoadingGroups(false);
      return;
    }

    if (staffGroupsData && staffGroupsData.length > 0) {
      const groupIds = staffGroupsData.map(sg => sg.group_id);
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('athlete_groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          return { ...group, member_count: count || 0 };
        })
      );

      const groupsMap = new Map(groupsWithCounts.map(g => [g.id, g]));
      const enrichedAssignments = staffGroupsData.map(sg => ({
        ...sg,
        group: groupsMap.get(sg.group_id)
      }));
      setGroupAssignments(enrichedAssignments);
    } else {
      setGroupAssignments([]);
    }
    setLoadingGroups(false);
  }

  async function fetchAllGroups() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching groups:', error);
    } else {
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from('athlete_groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          return { ...group, member_count: count || 0 };
        })
      );
      setAllGroups(groupsWithCounts);
    }
    setLoadingAllGroups(false);
  }

  async function handleAssignGroup(groupId: string) {
    setAssigningGroup(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('staff_groups')
      .insert({
        staff_id: staffMember.user_id,
        group_id: groupId,
        role: 'member'
      });

    if (error) {
      console.error('Error assigning staff to group:', error);
      alert(`Failed to assign to group: ${error.message}`);
    } else {
      await fetchGroupAssignments();
      await fetchAllGroups();
      setShowGroupAssign(false);
    }
    setAssigningGroup(false);
  }

  async function handleUnassignGroup(staffGroupId: string) {
    if (!confirm('Remove this group assignment?')) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('staff_groups')
      .delete()
      .eq('id', staffGroupId);

    if (error) {
      console.error('Error unassigning staff from group:', error);
      alert(`Failed to unassign from group: ${error.message}`);
    } else {
      await fetchGroupAssignments();
      await fetchAllGroups();
    }
  }

  // Filter available athletes/groups
  const availableAthletes = allAthletes.filter(a => !athleteIds.includes(a.id));
  const filteredAvailableAthletes = availableAthletes.filter(a => {
    if (!athleteSearchQuery) return true;
    const query = athleteSearchQuery.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(query) ||
      a.last_name.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query)
    );
  });

  const assignedGroupIds = groupAssignments.map(a => a.group_id);
  const availableGroups = allGroups.filter(g => !assignedGroupIds.includes(g.id));
  const filteredAvailableGroups = availableGroups.filter(g => {
    if (!groupSearchQuery) return true;
    const query = groupSearchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(query) ||
      (g.description && g.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-6xl space-y-6">
      {/* Athletes Section - Only for Coaches */}
      {isCoach && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-white">Assigned Athletes</h2>
            <button
              onClick={() => setShowAthleteAssign(!showAthleteAssign)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black rounded-lg transition-colors font-medium text-sm lg:text-base"
            >
              <UserPlus size={18} />
              {showAthleteAssign ? 'Hide Available' : 'Assign Athletes'}
            </button>
          </div>

          {/* Assign Athletes Panel */}
          {showAthleteAssign && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 mb-4">
              <h3 className="text-base lg:text-lg font-semibold text-white mb-3">
                Available Athletes ({availableAthletes.length})
              </h3>
              <input
                type="text"
                value={athleteSearchQuery}
                onChange={(e) => setAthleteSearchQuery(e.target.value)}
                placeholder="Search athletes..."
                className="w-full px-3 lg:px-4 py-2 mb-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
              />
              {loadingAllAthletes ? (
                <div className="text-center py-6 text-gray-400 text-sm">Loading athletes...</div>
              ) : filteredAvailableAthletes.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  {athleteSearchQuery ? 'No athletes match your search' : 'All athletes assigned'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredAvailableAthletes.map((athlete) => (
                    <div key={athlete.id} className="flex items-center justify-between p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs lg:text-sm font-semibold flex-shrink-0">
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium truncate text-sm lg:text-base">
                            {athlete.first_name} {athlete.last_name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{athlete.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignAthlete(athlete.id)}
                        disabled={assigningAthlete}
                        className="px-2.5 lg:px-3 py-1 lg:py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs lg:text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assigned Athletes List */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
            {loadingAthletes ? (
              <div className="text-center py-8 text-gray-400">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No athletes assigned yet</div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs lg:text-sm font-semibold flex-shrink-0">
                        {assignment.athlete?.first_name?.[0]}{assignment.athlete?.last_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium truncate text-sm lg:text-base">
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
                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePrimary(assignment.athlete_id, assignment.is_primary)}
                        className="px-2 lg:px-3 py-1 lg:py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs lg:text-sm font-medium transition-colors whitespace-nowrap"
                        title={assignment.is_primary ? 'Remove primary' : 'Set as primary'}
                      >
                        {assignment.is_primary ? '★' : '☆'}
                      </button>
                      <button
                        onClick={() => handleUnassignAthlete(assignment.athlete_id)}
                        className="p-1.5 lg:p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                        title="Remove assignment"
                      >
                        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Groups Section - For All Staff */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl lg:text-2xl font-bold text-white">Assigned Groups</h2>
          <button
            onClick={() => setShowGroupAssign(!showGroupAssign)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] text-black rounded-lg transition-colors font-medium text-sm lg:text-base"
          >
            <Users size={18} />
            {showGroupAssign ? 'Hide Available' : 'Assign Groups'}
          </button>
        </div>

        {/* Assign Groups Panel */}
        {showGroupAssign && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-white mb-3">
              Available Groups ({availableGroups.length})
            </h3>
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="w-full px-3 lg:px-4 py-2 mb-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
            />
            {loadingAllGroups ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading groups...</div>
            ) : filteredAvailableGroups.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                {groupSearchQuery ? 'No groups match your search' : 'All groups assigned'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAvailableGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: group.color || '#9BDDFF' }}
                      >
                        {group.name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium truncate text-sm lg:text-base">{group.name}</div>
                        {group.description && (
                          <div className="text-xs text-gray-400 truncate">{group.description}</div>
                        )}
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 text-gray-300 text-xs font-medium rounded">
                          {group.member_count || 0} members
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignGroup(group.id)}
                      disabled={assigningGroup}
                      className="px-2.5 lg:px-3 py-1 lg:py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs lg:text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assigned Groups List */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
          {loadingGroups ? (
            <div className="text-center py-8 text-gray-400">Loading assignments...</div>
          ) : groupAssignments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No groups assigned yet</div>
          ) : (
            <div className="space-y-2">
              {groupAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: assignment.group?.color || '#9BDDFF' }}
                    >
                      {assignment.group?.name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/groups/${assignment.group_id}`}
                        className="text-white font-medium truncate hover:underline block text-sm lg:text-base"
                      >
                        {assignment.group?.name}
                      </Link>
                      {assignment.group?.description && (
                        <div className="text-xs text-gray-400 truncate">{assignment.group.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 bg-white/5 text-gray-300 text-xs font-medium rounded">
                          {assignment.group?.member_count || 0} members
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-medium rounded capitalize">
                          {assignment.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassignGroup(assignment.id)}
                    className="p-1.5 lg:p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors flex-shrink-0"
                    title="Remove assignment"
                  >
                    <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
