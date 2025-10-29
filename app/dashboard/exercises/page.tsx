'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreateExerciseDialog } from '@/components/dashboard/exercises/create-exercise-dialog';
import { CustomMeasurementsManager } from '@/components/dashboard/exercises/custom-measurements-manager';
import { BulkEditDialog } from '@/components/dashboard/exercises/bulk-edit-dialog';
import { ExerciseTagsManager } from '@/components/dashboard/exercises/exercise-tags-manager';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter, canEditContent, canDeleteContent } from '@/lib/auth/permissions';

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string | null;
  video_url: string | null;
  cues: string[] | null;
  equipment: string[] | null;
  metric_schema: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'strength_conditioning', label: 'Strength + Conditioning' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'strength_conditioning' | 'hitting' | 'throwing'>('strength_conditioning');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);
  const [exercisePermissions, setExercisePermissions] = useState<{[key: string]: {canEdit: boolean, canDelete: boolean}}>({});

  // Fetch user info and permissions
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Get user role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role || 'coach');
        }
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchExercises();
    }
  }, [userId, userRole, JSON.stringify(permissions?.allowed_exercise_tags)]);

  useEffect(() => {
    let filtered = exercises;

    // Filter by active category tab
    filtered = filtered.filter(ex => ex.category === activeCategory);

    // Filter by tags
    if (tagFilter.length > 0) {
      filtered = filtered.filter(ex =>
        tagFilter.every(selectedTag => ex.tags?.includes(selectedTag))
      );
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredExercises(filtered);
  }, [searchQuery, activeCategory, tagFilter, exercises]);

  async function fetchExercises() {
    const supabase = createClient();

    if (!userId) return;

    console.log('🔍 fetchExercises called with permissions:', {
      userId,
      userRole,
      hasPermissions: !!permissions,
      allowed_exercise_tags: permissions?.allowed_exercise_tags,
      exercises_visibility: permissions?.exercises_visibility
    });

    let query = supabase
      .from('exercises')
      .select(`
        *,
        creator:created_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_active', true);

    // 🏷️ Tag filtering OVERRIDES visibility filtering
    if (permissions?.allowed_exercise_tags && permissions.allowed_exercise_tags.length > 0) {
      // Tags are set - ignore visibility settings, just show exercises with matching tags
      console.log(`🏷️ Tag filtering enabled - skipping visibility filter (allowed tags: ${permissions.allowed_exercise_tags.join(', ')})`);
    } else {
      console.log('⚠️ No tag filtering - using normal visibility rules');
      // No tags set - apply normal visibility filter
      const filter = await getContentFilter(userId, userRole, 'exercises');
      if (filter.filter === 'ids' && filter.creatorIds) {
        if (filter.creatorIds.length === 0) {
          // No creators allowed - show nothing
          setExercises([]);
          setFilteredExercises([]);
          setLoading(false);
          return;
        }
        query = query.in('created_by', filter.creatorIds);
      }
      // If filter === 'all', don't add any filter (show all)
    }

    const { data, error } = await query.order('name');

    console.log('Exercises loaded:', { count: data?.length, data, error });

    if (data) {
      // 🏷️ Apply tag filtering if staff has tag restrictions
      let filteredData = data;
      if (permissions?.allowed_exercise_tags && permissions.allowed_exercise_tags.length > 0) {
        const allowedTags = permissions.allowed_exercise_tags;
        filteredData = data.filter(exercise => {
          // Exercise must have at least one tag that matches the allowed tags
          if (!exercise.tags || exercise.tags.length === 0) return false;
          return exercise.tags.some(tag => allowedTags.includes(tag));
        });
        console.log(`🏷️ Tag filtering: ${data.length} → ${filteredData.length} exercises (allowed tags: ${allowedTags.join(', ')})`);
      }

      // Filter out system exercises
      const userExercises = filteredData.filter(ex => !ex.tags?.includes('_system'));

      setExercises(userExercises);
      setFilteredExercises(userExercises);

      // Extract all unique tags (excluding _system)
      const tagsSet = new Set<string>();
      userExercises.forEach((ex) => {
        ex.tags?.forEach((tag: string) => {
          if (tag !== '_system') {
            tagsSet.add(tag);
          }
        });
      });
      setAvailableTags(Array.from(tagsSet).sort());

      // Compute permissions for each exercise (optimized batch processing)
      const permsMap: {[key: string]: {canEdit: boolean, canDelete: boolean}} = {};

      // Get all unique creator IDs
      const creatorIds = [...new Set(userExercises.map(ex => ex.created_by).filter(Boolean))] as string[];

      // Batch fetch all creator roles at once
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, app_role')
        .in('id', creatorIds);

      const creatorRoles = new Map(creators?.map(c => [c.id, c.app_role]) || []);

      // Compute permissions for each exercise using cached creator roles
      for (const ex of userExercises) {
        const isOwnExercise = ex.created_by === userId;
        const creatorRole = ex.created_by ? creatorRoles.get(ex.created_by) : null;
        const isAdminOrSuperAdminExercise = creatorRole === 'admin' || creatorRole === 'super_admin';

        permsMap[ex.id] = {
          canEdit: userRole === 'super_admin' ||
                   (isOwnExercise && permissions?.can_edit_own_exercises) ||
                   (isAdminOrSuperAdminExercise && permissions?.can_edit_admin_exercises),
          canDelete: userRole === 'super_admin' ||
                     (isOwnExercise && permissions?.can_delete_own_exercises) ||
                     (isAdminOrSuperAdminExercise && permissions?.can_delete_admin_exercises),
        };
      }
      setExercisePermissions(permsMap);
    }

    setLoading(false);
  }

  async function handleDelete(exerciseId: string) {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('exercises')
      .update({ is_active: false })
      .eq('id', exerciseId);

    if (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise');
    } else {
      fetchExercises();
    }
  }

  function handleEdit(exercise: Exercise) {
    setEditingExercise(exercise);
    setDialogOpen(true);
  }

  function handleCreateNew() {
    setEditingExercise(null);
    setDialogOpen(true);
  }

  function toggleSelectAll() {
    if (selectedExercises.length === filteredExercises.length) {
      setSelectedExercises([]);
    } else {
      setSelectedExercises(filteredExercises.map(ex => ex.id));
    }
  }

  function toggleSelectExercise(exerciseId: string) {
    if (selectedExercises.includes(exerciseId)) {
      setSelectedExercises(selectedExercises.filter(id => id !== exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, exerciseId]);
    }
  }

  async function handleBulkDelete() {
    if (selectedExercises.length === 0) return;
    if (!confirm(`Delete ${selectedExercises.length} exercise(s)? This cannot be undone.`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('exercises')
      .update({ is_active: false })
      .in('id', selectedExercises);

    if (error) {
      console.error('Error bulk deleting exercises:', error);
      alert('Failed to delete exercises');
    } else {
      setSelectedExercises([]);
      fetchExercises();
    }
  }

  function getTagColor(tag: string) {
    const colors: { [key: string]: string } = {
      strength: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      hitting: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      pitching: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
      throwing: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
      mobility: 'bg-green-500/20 text-green-300 border-green-500/50',
      conditioning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      power: 'bg-red-500/20 text-red-300 border-red-500/50',
      recovery: 'bg-teal-500/20 text-teal-300 border-teal-500/50',
      assessment: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    };
    return colors[tag?.toLowerCase()] || colors.assessment;
  }

  // Check if user can edit specific exercise
  async function canEditExercise(exercise: Exercise): Promise<boolean> {
    if (!userId) return false;
    return await canEditContent(userId, userRole, 'exercises', exercise.created_by);
  }

  // Check if user can delete specific exercise
  async function canDeleteExercise(exercise: Exercise): Promise<boolean> {
    if (!userId) return false;
    return await canDeleteContent(userId, userRole, 'exercises', exercise.created_by);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white/20 border-r-white"></div>
          <p className="mt-4 text-sm text-white/50">Loading exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Exercise Library</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {selectedExercises.length > 0
              ? `${selectedExercises.length} selected`
              : `${exercises.length} exercises`}
          </p>
        </div>
        <div className="flex gap-2 md:gap-3 flex-wrap">
          {selectedExercises.length > 0 ? (
            <>
              <button
                onClick={() => setShowBulkEditDialog(true)}
                className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Edit ({selectedExercises.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Delete ({selectedExercises.length})
              </button>
              <button
                onClick={() => setSelectedExercises([])}
                className="px-3 md:px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setManagerOpen(true)}
                className="px-3 md:px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all whitespace-nowrap"
              >
                ⚙️ Measurements
              </button>
              <button
                onClick={() => setTagsManagerOpen(true)}
                className="px-3 md:px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all whitespace-nowrap"
              >
                🏷️ Tags
              </button>
              {/* Only show Create button if user has permission */}
              {(userRole === 'super_admin' || permissions?.can_create_exercises) && (
                <button
                  onClick={handleCreateNew}
                  className="px-3 md:px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black text-sm font-semibold rounded-lg transition-all whitespace-nowrap"
                >
                  + Create
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-4 md:mb-6 border-b border-white/10 -mx-3 md:mx-0">
        <div className="flex gap-0 overflow-x-auto px-3 md:px-0 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('strength_conditioning')}
            className={`px-4 md:px-6 py-3 font-semibold text-xs md:text-sm transition-all border-b-2 whitespace-nowrap ${
              activeCategory === 'strength_conditioning'
                ? 'text-[#9BDDFF] border-[#9BDDFF]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            📁 Strength
          </button>
          <button
            onClick={() => setActiveCategory('hitting')}
            className={`px-4 md:px-6 py-3 font-semibold text-xs md:text-sm transition-all border-b-2 whitespace-nowrap ${
              activeCategory === 'hitting'
                ? 'text-[#9BDDFF] border-[#9BDDFF]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            📁 Hitting
          </button>
          <button
            onClick={() => setActiveCategory('throwing')}
            className={`px-4 md:px-6 py-3 font-semibold text-xs md:text-sm transition-all border-b-2 whitespace-nowrap ${
              activeCategory === 'throwing'
                ? 'text-[#9BDDFF] border-[#9BDDFF]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            📁 Throwing
          </button>
        </div>
      </div>

      {/* Search and Tag Filter */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row gap-3 md:gap-4">
        {/* Search */}
        <div className="relative flex-1 md:max-w-md">
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 md:py-3 pl-10 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
          />
          <svg
            className="absolute left-3 top-3 h-4 w-4 md:h-5 md:w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Tag Filter */}
        <div className="w-full md:w-64">
          <select
            onChange={(e) => {
              if (e.target.value && !tagFilter.includes(e.target.value)) {
                setTagFilter([...tagFilter, e.target.value]);
                e.target.value = '';
              }
            }}
            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
            defaultValue=""
          >
            <option value="" disabled className="bg-[#0A0A0A]">
              Filter by tags...
            </option>
            {availableTags
              .filter(tag => !tagFilter.includes(tag))
              .map((tag) => (
                <option key={tag} value={tag} className="bg-[#0A0A0A] capitalize">
                  {tag}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {tagFilter.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-400">Active tag filters:</span>
          {tagFilter.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[#9BDDFF]/20 text-[#9BDDFF] rounded-full text-sm flex items-center gap-2 border border-[#9BDDFF]/50"
            >
              {tag}
              <button
                onClick={() => setTagFilter(tagFilter.filter(t => t !== tag))}
                className="hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => setTagFilter([])}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Exercise Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        {/* Mobile: Add horizontal scroll with touch support */}
        <div className="overflow-x-auto -mx-3 md:mx-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="min-w-[800px]"> {/* Minimum width to enable scrolling */}
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                <input
                  type="checkbox"
                  checked={selectedExercises.length === filteredExercises.length && filteredExercises.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Thumbnail</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Tags</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Created By</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Created</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <tr
                  key={exercise.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedExercises.includes(exercise.id)}
                      onChange={() => toggleSelectExercise(exercise.id)}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] font-bold text-xs">
                      ASP
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{exercise.name}</div>
                    {exercise.description && (
                      <div className="text-sm text-gray-400 mt-1 truncate max-w-xs">
                        {exercise.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-[#9BDDFF]/20 text-[#9BDDFF] rounded-full text-xs font-medium border border-[#9BDDFF]/50">
                      {CATEGORIES.find(c => c.value === exercise.category)?.label || exercise.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {exercise.tags?.length > 0 ? (
                        exercise.tags.map((tag) => (
                          <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag)}`}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {exercise.creator ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                          {exercise.creator.first_name?.[0]}{exercise.creator.last_name?.[0]}
                        </div>
                        <div className="text-sm text-neutral-300">
                          {exercise.creator.first_name} {exercise.creator.last_name}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      {new Date(exercise.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Show Edit button only if user has permission */}
                      {exercisePermissions[exercise.id]?.canEdit && (
                        <button
                          onClick={() => handleEdit(exercise)}
                          className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                          title="Edit exercise"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {/* Show Delete button only if user has permission */}
                      {exercisePermissions[exercise.id]?.canDelete && (
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                          title="Delete exercise"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    {searchQuery ? 'No exercises found matching your search' : 'No exercises yet. Create your first exercise!'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <CreateExerciseDialog
          exercise={editingExercise}
          onClose={() => {
            setDialogOpen(false);
            setEditingExercise(null);
          }}
          onSuccess={() => {
            setDialogOpen(false);
            setEditingExercise(null);
            fetchExercises();
          }}
        />
      )}

      {/* Bulk Edit Dialog */}
      {showBulkEditDialog && (
        <BulkEditDialog
          exerciseIds={selectedExercises}
          onClose={() => setShowBulkEditDialog(false)}
          onSuccess={() => {
            setShowBulkEditDialog(false);
            setSelectedExercises([]);
            fetchExercises();
          }}
        />
      )}

      {managerOpen && (
        <CustomMeasurementsManager
          onClose={() => setManagerOpen(false)}
          onUpdate={() => fetchExercises()}
        />
      )}

      {tagsManagerOpen && (
        <ExerciseTagsManager
          onClose={() => setTagsManagerOpen(false)}
        />
      )}
    </div>
  );
}
