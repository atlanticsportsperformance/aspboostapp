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
            <div className="absolute inset-0 rounded-full border-2 border-[#9BDDFF]/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-[#9BDDFF] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="p-3 lg:p-6">
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-white">Groups</h1>
              <p className="text-gray-400 text-xs lg:text-sm mt-0.5 lg:mt-1 hidden sm:block">
                Manage team groups and schedules
              </p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search - Desktop only */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm hover:bg-white/10 transition-colors"
              >
                <Search size={16} />
                <span>Search...</span>
                <kbd className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Search Icon - Mobile */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="lg:hidden p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10 transition-colors"
              >
                <Search size={18} />
              </button>

              {/* Create Group Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-2 lg:px-4 lg:py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black font-medium rounded-lg transition-colors flex items-center gap-2 text-sm lg:text-base"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">New Group</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 lg:p-6 pb-20 lg:pb-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4 mb-4 lg:mb-8">
          {/* Total Groups */}
          <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 lg:p-5">
            <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Groups</p>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-[#9BDDFF]/10 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="lg:w-5 lg:h-5 text-[#9BDDFF]" />
              </div>
              <p className="text-xl lg:text-3xl font-bold text-white">{stats.totalGroups}</p>
            </div>
          </div>

          {/* Total Athletes */}
          <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 lg:p-5">
            <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Athletes</p>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Target size={14} className="lg:w-5 lg:h-5 text-blue-500" />
              </div>
              <p className="text-xl lg:text-3xl font-bold text-white">{stats.totalAthletes}</p>
            </div>
          </div>

          {/* Active Workouts */}
          <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 lg:p-5">
            <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Workouts</p>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="lg:w-5 lg:h-5 text-purple-500" />
              </div>
              <p className="text-xl lg:text-3xl font-bold text-white">{stats.activeWorkouts}</p>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white/5 border border-white/10 rounded-lg lg:rounded-xl p-2 lg:p-5">
            <p className="text-gray-400 text-xs lg:text-sm font-medium mb-2 lg:mb-3">Completion</p>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="h-6 w-6 lg:h-10 lg:w-10 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} className="lg:w-5 lg:h-5 text-emerald-500" />
              </div>
              <p className="text-xl lg:text-3xl font-bold text-white">{stats.avgCompletion}%</p>
            </div>
          </div>

          {/* Quick Action - Hidden on mobile */}
          <div className="hidden lg:flex bg-gradient-to-br from-[#9BDDFF]/20 to-[#9BDDFF]/5 border border-[#9BDDFF]/20 rounded-xl p-5 hover:border-[#9BDDFF]/40 transition-all cursor-pointer">
            <div className="flex flex-col items-center justify-center w-full text-center">
              <Award size={24} className="text-[#9BDDFF] mb-2" />
              <p className="text-sm font-semibold text-white mb-1">Quick Schedule</p>
              <p className="text-xs text-gray-400">Bulk assign workouts</p>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-1 lg:gap-2">
            {['all', 'active', 'archived'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter as any)}
                className={`px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-lg transition-all ${
                  selectedFilter === filter
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden lg:block p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Filter size={18} />
            </button>
            <div className="hidden lg:block h-4 w-px bg-white/10"></div>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" className="lg:w-[18px] lg:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" className="lg:w-[18px] lg:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  className="px-6 py-3 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black font-semibold rounded-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create Your First Group
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-4' : 'space-y-2 lg:space-y-3'}>
            {filteredGroups.map((group, index) => (
              <div
                key={group.id}
                className="group relative bg-white/5 border border-white/10 rounded-lg lg:rounded-xl hover:border-white/20 transition-all cursor-pointer"
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

                <div className="relative p-3 lg:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 lg:mb-4">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${group.color}15` }}
                      >
                        <Users size={18} className="lg:w-5 lg:h-5" style={{ color: group.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm lg:text-base font-semibold text-white">{group.name}</h3>
                        <p className="text-xs text-gray-500">{group.memberCount} athletes</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      className="p-1 lg:p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} className="lg:w-4 lg:h-4" />
                    </button>
                  </div>

                  {/* Description - Hidden on mobile */}
                  <p className="hidden lg:block text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                    {group.description || 'No description'}
                  </p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-3 lg:mb-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-2 lg:p-2.5">
                      <p className="text-[10px] lg:text-xs text-gray-500 mb-0.5">Workouts</p>
                      <p className="text-base lg:text-lg font-bold text-white">{group.upcomingWorkouts}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-2 lg:p-2.5">
                      <p className="text-[10px] lg:text-xs text-gray-500 mb-0.5">Rate</p>
                      <p className="text-base lg:text-lg font-bold text-emerald-400">{group.completionRate}%</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-2 lg:p-2.5 flex items-center justify-center">
                      <div
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-4 flex items-center justify-center"
                        style={{
                          borderColor: `${group.color}30`,
                          borderTopColor: group.color
                        }}
                      >
                        <TrendingUp size={14} className="lg:w-4 lg:h-4" style={{ color: group.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Tags - Hidden on mobile */}
                  {group.tags && group.tags.length > 0 && (
                    <div className="hidden lg:flex flex-wrap gap-1.5 mb-4">
                      {group.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-[10px] font-medium bg-white/5 text-gray-400 rounded-md border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                      {group.tags.length > 3 && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-white/5 text-gray-400 rounded-md border border-white/10">
                          +{group.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="flex items-center gap-2 pt-3 lg:pt-4 border-t border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-xs text-gray-500">{group.recentActivity}</p>
                  </div>
                </div>

                {/* Hover Action Bar - Desktop only */}
                <div className="hidden lg:flex absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-end justify-center pb-2">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg backdrop-blur-xl transition-colors">
                      View Details
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg backdrop-blur-xl transition-colors">
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
    { name: 'Gold', value: '#9BDDFF' },
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
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent transition-all outline-none"
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
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent resize-none transition-all outline-none"
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
                      ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-[#9BDDFF] scale-110'
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
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent transition-all outline-none"
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
            className="flex-1 px-4 py-3 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
