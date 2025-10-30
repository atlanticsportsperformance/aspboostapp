'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface StaffGroupsTabProps {
  staffMember: {
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
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

export default function StaffGroupsTab({ staffMember }: StaffGroupsTabProps) {
  const [assignments, setAssignments] = useState<StaffGroup[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchAssignments();
    fetchAllGroups();
  }, [staffMember.user_id]);

  async function fetchAssignments() {
    const supabase = createClient();

    const { data: staffGroupsData, error } = await supabase
      .from('staff_groups')
      .select('*')
      .eq('staff_id', staffMember.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff groups:', error);
      setLoading(false);
      return;
    }

    // Fetch group details for each assignment
    if (staffGroupsData && staffGroupsData.length > 0) {
      const groupIds = staffGroupsData.map(sg => sg.group_id);
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      // Get member counts
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('athlete_groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      const groupsMap = new Map(groupsWithCounts.map(g => [g.id, g]));
      const enrichedAssignments = staffGroupsData.map(sg => ({
        ...sg,
        group: groupsMap.get(sg.group_id)
      }));

      setAssignments(enrichedAssignments);
    } else {
      setAssignments([]);
    }

    setLoading(false);
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
      // Get member counts for all groups
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from('athlete_groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setAllGroups(groupsWithCounts);
    }

    setLoadingGroups(false);
  }

  async function handleAssign(groupId: string) {
    setAssigning(true);
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
      await fetchAssignments();
    }

    setAssigning(false);
  }

  async function handleUnassign(staffGroupId: string) {
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
      await fetchAssignments();
      await fetchAllGroups(); // Refresh to update available groups
    }
  }

  // Get assigned group IDs
  const assignedGroupIds = assignments.map(a => a.group_id);

  // Filter available groups (not yet assigned)
  const availableGroups = allGroups.filter(g => !assignedGroupIds.includes(g.id));

  // Filter by search
  const filteredAvailable = availableGroups.filter(g => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(query) ||
      (g.description && g.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-white mb-6">Assigned Groups</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Groups */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Currently Assigned ({assignments.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No groups assigned yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: assignment.group?.color || '#9BDDFF' }}
                    >
                      {assignment.group?.name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/groups/${assignment.group_id}`}
                        className="text-white font-medium truncate hover:underline block"
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
                    onClick={() => handleUnassign(assignment.id)}
                    className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors flex-shrink-0"
                    title="Remove assignment"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Groups */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Available Groups ({availableGroups.length})
          </h3>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full px-4 py-2 mb-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {loadingGroups ? (
            <div className="text-center py-8 text-gray-400">Loading groups...</div>
          ) : filteredAvailable.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? 'No groups match your search' : 'All groups have been assigned'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filteredAvailable.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: group.color || '#9BDDFF' }}
                    >
                      {group.name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">
                        {group.name}
                      </div>
                      {group.description && (
                        <div className="text-xs text-gray-400 truncate">{group.description}</div>
                      )}
                      <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 text-gray-300 text-xs font-medium rounded">
                        {group.member_count || 0} members
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(group.id)}
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
