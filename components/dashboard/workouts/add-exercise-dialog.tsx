'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter } from '@/lib/auth/permissions';

interface Exercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
}

interface Workout {
  id: string;
  is_template: boolean;
  placeholder_definitions: {
    placeholders: Array<{
      id: string;
      name: string;
      category_hint?: string;
    }>;
  };
}

interface AddExerciseDialogProps {
  workout: Workout;
  onClose: () => void;
  onAdd: (
    exerciseId: string,
    isPlaceholder: boolean,
    placeholderId?: string,
    placeholderName?: string,
    categoryHint?: string,
    sets?: string,
    reps?: string,
    intensity?: string
  ) => void;
  onAddMultiple?: (exerciseIds: string[]) => void;
  onAddMultiplePlaceholders?: (placeholderIds: string[]) => void;
}

export function AddExerciseDialog({ workout, onClose, onAdd, onAddMultiple, onAddMultiplePlaceholders }: AddExerciseDialogProps) {
  const [mode, setMode] = useState<'direct' | 'placeholder'>('direct');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [placeholders, setPlaceholders] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>('');
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // 🔐 Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);

  // Get unique tags from exercises
  const allTags = Array.from(new Set(exercises.flatMap(ex => ex.tags || []))).sort();

  // 🔐 Load user info and permissions
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
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
    if (userId && mode === 'direct') {
      fetchExercises();
    } else if (userId && mode === 'placeholder') {
      fetchPlaceholders();
    }
  }, [mode, userId, userRole]);

  async function fetchExercises() {
    if (!userId) return;

    setLoading(true);

    // 🔐 Apply visibility filter
    const filter = await getContentFilter(userId, userRole, 'exercises');

    let query = supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .eq('is_placeholder', false)
      .order('name');

    // 🔐 Apply creator filter based on permissions
    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setExercises([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exercises:', error);
    } else if (data) {
      // 🏷️ Apply tag filtering if staff has tag restrictions
      let filteredData = data;
      if (permissions?.allowed_exercise_tags && permissions.allowed_exercise_tags.length > 0) {
        const allowedTags = permissions.allowed_exercise_tags;
        filteredData = data.filter(exercise => {
          // Exercise must have at least one tag that matches the allowed tags
          if (!exercise.tags || exercise.tags.length === 0) return false;
          return exercise.tags.some(tag => allowedTags.includes(tag));
        });
        console.log(`🏷️ [AddExerciseDialog] Tag filtering: ${data.length} → ${filteredData.length} exercises (allowed tags: ${allowedTags.join(', ')})`);
      }

      // Filter out system exercises (used for measurement/tag definitions)
      const userExercises = filteredData.filter(ex => !ex.tags?.includes('_system'));
      setExercises(userExercises);
    }

    setLoading(false);
  }

  async function fetchPlaceholders() {
    setLoading(true);

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .eq('is_placeholder', true)
      .order('name');

    if (error) {
      console.error('Error fetching placeholders:', error);
    } else {
      setPlaceholders(data || []);
    }

    setLoading(false);
  }

  function toggleExerciseSelection(exerciseId: string) {
    if (selectedExercises.includes(exerciseId)) {
      setSelectedExercises(selectedExercises.filter(id => id !== exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, exerciseId]);
    }
  }

  function toggleSelectAll() {
    if (selectedExercises.length === filteredExercises.length) {
      setSelectedExercises([]);
    } else {
      setSelectedExercises(filteredExercises.map(ex => ex.id));
    }
  }

  function togglePlaceholderSelection(placeholderId: string) {
    if (selectedPlaceholders.includes(placeholderId)) {
      setSelectedPlaceholders(selectedPlaceholders.filter(id => id !== placeholderId));
    } else {
      setSelectedPlaceholders([...selectedPlaceholders, placeholderId]);
    }
  }

  function toggleSelectAllPlaceholders() {
    if (selectedPlaceholders.length === placeholders.length) {
      setSelectedPlaceholders([]);
    } else {
      setSelectedPlaceholders(placeholders.map(p => p.id));
    }
  }

  async function handleAddDirect() {
    console.log('🟣 handleAddDirect called');
    console.log('🟣 selectedExercises:', selectedExercises);
    console.log('🟣 selectedExercise:', selectedExercise);

    if (selectedExercises.length === 0 && !selectedExercise) {
      alert('Please select at least one exercise');
      return;
    }

    // Multi-select mode
    if (selectedExercises.length > 0) {
      console.log('🟣 Using multi-select mode');
      if (onAddMultiple) {
        console.log('🟣 Calling onAddMultiple with', selectedExercises.length, 'exercises');
        onAddMultiple(selectedExercises);
      } else {
        console.log('🟣 Calling onAdd for each exercise');
        // Fallback: add exercises one by one
        selectedExercises.forEach(id => onAdd(id, false));
      }
      // Don't call onClose() - let the parent handler close the dialog after adding completes
      return;
    }

    // Single select mode (backwards compatibility)
    if (selectedExercise) {
      console.log('🟣 Using single-select mode, calling onAdd');
      onAdd(selectedExercise, false);
      // Don't call onClose() - let the parent handler close the dialog after adding completes
    }
  }

  async function handleAddPlaceholder() {
    if (selectedPlaceholders.length === 0 && !selectedPlaceholder) {
      alert('Please select at least one placeholder');
      return;
    }

    // Multi-select mode
    if (selectedPlaceholders.length > 0) {
      if (onAddMultiplePlaceholders) {
        onAddMultiplePlaceholders(selectedPlaceholders);
      } else {
        // Fallback: add placeholders one by one
        selectedPlaceholders.forEach(id => onAdd(id, true));
      }
      // Don't call onClose() - let the parent handler close the dialog after adding completes
      return;
    }

    // Single select mode (backwards compatibility with dropdown)
    if (selectedPlaceholder) {
      onAdd(selectedPlaceholder, true);
      // Don't call onClose() - let the parent handler close the dialog after adding completes
    }
  }

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
    const matchesTag = tagFilter === 'all' || (ex.tags && ex.tags.includes(tagFilter));
    return matchesSearch && matchesCategory && matchesTag;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {mode === 'direct' ? 'Add Exercise' : 'Add Placeholder'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-6 border-b border-white/10">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="direct"
                checked={mode === 'direct'}
                onChange={() => setMode('direct')}
                className="w-4 h-4"
              />
              <span className="text-white">Direct Exercise</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="placeholder"
                checked={mode === 'placeholder'}
                onChange={() => setMode('placeholder')}
                className="w-4 h-4"
              />
              <span className="text-white">Placeholder</span>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'direct' ? (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="strength_conditioning">Strength + Conditioning</option>
                  <option value="hitting">Hitting</option>
                  <option value="throwing">Throwing</option>
                </select>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Select All + Counter */}
              {filteredExercises.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedExercises.length === filteredExercises.length && filteredExercises.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm font-medium">Select All</span>
                  </label>
                  {selectedExercises.length > 0 && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold border border-blue-500/50">
                      {selectedExercises.length} selected
                    </span>
                  )}
                </div>
              )}

              {/* Exercise List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-gray-400 text-center py-8">Loading exercises...</div>
                ) : filteredExercises.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">No exercises found</div>
                ) : (
                  filteredExercises.map((exercise) => (
                    <label
                      key={exercise.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedExercises.includes(exercise.id)
                          ? 'bg-blue-500/20 border-blue-500'
                          : 'bg-white/5 hover:bg-white/10 border-transparent'
                      } border`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExercises.includes(exercise.id)}
                        onChange={() => toggleExerciseSelection(exercise.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">{exercise.name}</div>
                        <div className="text-sm text-gray-400">
                          {exercise.category.replace('_', ' ')}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-gray-400 text-center py-8">Loading placeholders...</div>
              ) : placeholders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No placeholders found</p>
                    <p className="text-sm mt-2">Create placeholders in Exercise Library → Manage Library → Placeholders</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Select All + Counter */}
                  {placeholders.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlaceholders.length === placeholders.length && placeholders.length > 0}
                          onChange={toggleSelectAllPlaceholders}
                          className="w-4 h-4"
                        />
                        <span className="text-white text-sm font-medium">Select All</span>
                      </label>
                      {selectedPlaceholders.length > 0 && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold border border-blue-500/50">
                          {selectedPlaceholders.length} selected
                        </span>
                      )}
                    </div>
                  )}

                  {/* Placeholder List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {placeholders.map((placeholder) => (
                      <label
                        key={placeholder.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedPlaceholders.includes(placeholder.id)
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-white/5 hover:bg-white/10 border-transparent'
                        } border`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlaceholders.includes(placeholder.id)}
                          onChange={() => togglePlaceholderSelection(placeholder.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-white font-medium">{placeholder.name}</div>
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium border border-blue-500/50">
                              PH
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {placeholder.category.replace('_', ' ')}
                          </div>
                          {placeholder.description && (
                            <div className="text-xs text-gray-500 italic mt-1">
                              {placeholder.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                    <p className="text-gray-300 text-sm">
                      <strong>What is a placeholder?</strong><br />
                      A placeholder is a template exercise slot that can be filled with different exercises for each
                      athlete. Perfect for personalized programs where athletes need different exercises
                      based on their individual needs.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'direct' ? handleAddDirect : handleAddPlaceholder}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {mode === 'direct'
              ? selectedExercises.length > 0
                ? `Add ${selectedExercises.length} Exercise${selectedExercises.length !== 1 ? 's' : ''}`
                : 'Add Exercise'
              : selectedPlaceholders.length > 0
                ? `Add ${selectedPlaceholders.length} Placeholder${selectedPlaceholders.length !== 1 ? 's' : ''}`
                : 'Add Placeholder'}
          </button>
        </div>
      </div>
    </div>
  );
}
