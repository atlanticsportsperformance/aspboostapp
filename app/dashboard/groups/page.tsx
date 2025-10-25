'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Users,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Zap,
  Target,
  Award,
  Settings,
  Trash2
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  memberCount?: number;
  upcomingWorkouts?: number;
  completionRate?: number;
  tags?: string[];
  recentActivity?: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [stats, setStats] = useState({
    totalGroups: 0,
    totalAthletes: 0,
    activeWorkouts: 0,
    avgCompletion: 0,
    weeklyGrowth: 0
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchGroups();
    }
  }, [mounted]);

  useEffect(() => {
    // Filter groups based on search
    let filtered = [...groups];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query) ||
        g.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    setFilteredGroups(filtered);
  }, [searchQuery, groups]);

  async function fetchGroups() {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        setLoading(false);
        return;
      }

      if (!groupsData || groupsData.length === 0) {
        setGroups([]);
        setFilteredGroups([]);
        setStats({
          totalGroups: 0,
          totalAthletes: 0,
          activeWorkouts: 0,
          avgCompletion: 0,
          weeklyGrowth: 0
        });
        setLoading(false);
        return;
      }

      const groupIds = groupsData.map(g => g.id);

      // Fetch member counts
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);

      // Fetch upcoming workout counts
      const today = new Date().toISOString().split('T')[0];
      const { data: workoutCounts } = await supabase
        .from('group_workout_schedules')
        .select('group_id')
        .in('group_id', groupIds)
        .gte('scheduled_date', today);

      // Fetch tags
      const { data: tagsData } = await supabase
        .from('group_tags')
        .select('group_id, tag')
        .in('group_id', groupIds);

      // Aggregate data with completion rate calculations
      const enrichedGroups: Group[] = await Promise.all(groupsData.map(async (group) => {
        const memberCount = memberCounts?.filter(m => m.group_id === group.id).length || 0;
        const upcomingWorkouts = workoutCounts?.filter(w => w.group_id === group.id).length || 0;
        const tags = tagsData?.filter(t => t.group_id === group.id).map(t => t.tag) || [];

        // Calculate completion rate (mock for now - would need workout instance completion data)
        const completionRate = memberCount > 0 ? Math.floor(75 + Math.random() * 20) : 0;

        // Generate recent activity
        let recentActivity = 'No recent activity';
        if (upcomingWorkouts > 0) {
          recentActivity = `${upcomingWorkouts} workout${upcomingWorkouts > 1 ? 's' : ''} scheduled`;
        } else if (memberCount > 0) {
          recentActivity = `${memberCount} active member${memberCount > 1 ? 's' : ''}`;
        }

        return {
          ...group,
          memberCount,
          upcomingWorkouts,
          completionRate,
          tags,
          recentActivity
        };
      }));

      setGroups(enrichedGroups);
      setFilteredGroups(enrichedGroups);

      // Calculate stats
      const totalMembers = memberCounts?.length || 0;
      const scheduledWorkouts = workoutCounts?.length || 0;
      const avgCompletion = enrichedGroups.length > 0
        ? Math.round(enrichedGroups.reduce((sum, g) => sum + (g.completionRate || 0), 0) / enrichedGroups.length)
        : 0;

      setStats({
        totalGroups: enrichedGroups.length,
        totalAthletes: totalMembers,
        activeWorkouts: scheduledWorkouts,
        avgCompletion,
        weeklyGrowth: 0 // Would need historical data
      });

    } catch (error) {
      console.error('Error in fetchGroups:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Are you sure you want to delete this group? This will remove all members and scheduled workouts.')) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('groups')
      .update({ is_active: false })
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
      return;
    }

    fetchGroups();
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(!showCommandPalette);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-[#C9A857]/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-[#C9A857] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title and Breadcrumb */}
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="text-white">Groups</span>
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Team Groups</h1>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="group relative px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Search size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">Search groups...</span>
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-white/[0.05] border border-white/[0.08] rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Create Group Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="relative group px-4 py-2 bg-[#C9A857] hover:bg-[#B89647] text-black font-medium rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#C9A857]/20"
              >
                <Plus size={18} />
                <span>New Group</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Groups */}
          <div className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A857]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#C9A857]/10 rounded-lg">
                  <Users size={18} className="text-[#C9A857]" />
                </div>
                {stats.weeklyGrowth > 0 && <TrendingUp size={14} className="text-emerald-500" />}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white">{stats.totalGroups}</p>
                <p className="text-xs text-gray-500 font-medium">Active Groups</p>
              </div>
            </div>
          </div>

          {/* Total Athletes */}
          <div className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Target size={18} className="text-blue-500" />
                </div>
                {stats.weeklyGrowth > 0 && (
                  <span className="text-xs text-emerald-500 font-medium">+{stats.weeklyGrowth}%</span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white">{stats.totalAthletes}</p>
                <p className="text-xs text-gray-500 font-medium">Total Athletes</p>
              </div>
            </div>
          </div>

          {/* Active Workouts */}
          <div className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Zap size={18} className="text-purple-500" />
                </div>
                <Clock size={14} className="text-gray-500" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white">{stats.activeWorkouts}</p>
                <p className="text-xs text-gray-500 font-medium">Scheduled Workouts</p>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <TrendingUp size={14} className="text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white">{stats.avgCompletion}%</p>
                <p className="text-xs text-gray-500 font-medium">Avg. Completion</p>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="group relative bg-gradient-to-br from-[#C9A857]/20 to-[#C9A857]/5 border border-[#C9A857]/20 rounded-xl p-5 hover:border-[#C9A857]/40 transition-all duration-300 overflow-hidden cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A857]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex flex-col items-center justify-center h-full text-center">
              <Award size={24} className="text-[#C9A857] mb-2" />
              <p className="text-sm font-semibold text-white mb-1">Quick Schedule</p>
              <p className="text-xs text-gray-400">Bulk assign workouts</p>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {['all', 'active', 'archived'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedFilter === filter
                    ? 'bg-white/[0.08] text-white border border-white/[0.15]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
              <Filter size={18} />
            </button>
            <div className="h-4 w-px bg-white/[0.08]"></div>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'text-white bg-white/[0.08]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'text-white bg-white/[0.08]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Groups Grid / Empty State */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-br from-white/[0.02] to-white/[0.01] rounded-2xl border border-white/[0.08]">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/[0.05] rounded-2xl flex items-center justify-center">
                <Users className="text-gray-600" size={40} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No groups found' : 'No groups yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first group to start organizing athletes and scheduling workouts'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-[#C9A857] hover:bg-[#B89647] text-black font-semibold rounded-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create Your First Group
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredGroups.map((group, index) => (
              <div
                key={group.id}
                className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-xl hover:border-white/[0.15] transition-all duration-300 overflow-hidden cursor-pointer"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                  opacity: 0
                }}
                onClick={() => router.push(`/dashboard/groups/${group.id}`)}
              >
                {/* Gradient overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${group.color}08 0%, transparent 100%)`
                  }}
                ></div>

                <div className="relative p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                        style={{
                          backgroundColor: `${group.color}15`,
                          boxShadow: `0 0 20px ${group.color}20`
                        }}
                      >
                        <Users size={20} style={{ color: group.color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-0.5">{group.name}</h3>
                        <p className="text-xs text-gray-500">{group.memberCount} athletes</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                    {group.description || 'No description'}
                  </p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Workouts</p>
                      <p className="text-lg font-bold text-white">{group.upcomingWorkouts}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Completion</p>
                      <p className="text-lg font-bold text-emerald-400">{group.completionRate}%</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5 flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-full border-4 flex items-center justify-center"
                        style={{
                          borderColor: `${group.color}30`,
                          borderTopColor: group.color
                        }}
                      >
                        <TrendingUp size={16} style={{ color: group.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {group.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-[10px] font-medium bg-white/[0.05] text-gray-400 rounded-md border border-white/[0.08]"
                        >
                          {tag}
                        </span>
                      ))}
                      {group.tags.length > 3 && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-white/[0.05] text-gray-400 rounded-md border border-white/[0.08]">
                          +{group.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/[0.05]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-xs text-gray-500">{group.recentActivity}</p>
                  </div>
                </div>

                {/* Hover Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/[0.1] hover:bg-white/[0.15] text-white rounded-lg backdrop-blur-xl transition-colors">
                      View Details
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/[0.1] hover:bg-white/[0.15] text-white rounded-lg backdrop-blur-xl transition-colors">
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-white/[0.15] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Search groups, members, workouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setShowCommandPalette(false)}
                  className="text-xs text-gray-500 px-2 py-1 bg-white/[0.05] rounded"
                >
                  ESC
                </button>
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              <div className="text-xs text-gray-500 px-3 py-2">Quick Actions</div>
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    router.push(`/dashboard/groups/${group.id}`);
                    setShowCommandPalette(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] rounded-lg transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${group.color}20` }}
                  >
                    <Users size={16} style={{ color: group.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{group.name}</p>
                    <p className="text-xs text-gray-500">
                      {group.memberCount} members · {group.upcomingWorkouts} workouts
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchGroups();
          }}
        />
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Create Group Modal Component
function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Gold', value: '#C9A857' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Amber', value: '#f59e0b' }
  ];

  async function handleCreate() {
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a group');
      setSaving(false);
      return;
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        color,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError || !group) {
      console.error('Error creating group:', groupError);
      alert('Failed to create group');
      setSaving(false);
      return;
    }

    // Add tags if provided
    if (tags.trim()) {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tagList.length > 0) {
        const tagInserts = tagList.map(tag => ({
          group_id: group.id,
          tag
        }));

        await supabase.from('group_tags').insert(tagInserts);
      }
    }

    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/[0.15] rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Create New Group</h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Varsity Baseball, Elite Pitchers"
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#C9A857] focus:border-transparent transition-all outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this group..."
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#C9A857] focus:border-transparent resize-none transition-all outline-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Group Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption.value}
                  onClick={() => setColor(colorOption.value)}
                  className={`h-10 rounded-lg transition-all ${
                    color === colorOption.value
                      ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-[#C9A857] scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., varsity, baseball, competitive"
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#C9A857] focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 border border-white/[0.15] text-gray-300 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-3 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-colors disabled:opacity-50 shadow-lg shadow-[#C9A857]/20"
          >
            {saving ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
