'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreateExerciseDialog } from '@/components/dashboard/exercises/create-exercise-dialog';
import { CustomMeasurementsManager } from '@/components/dashboard/exercises/custom-measurements-manager';

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    let filtered = exercises;

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ex => ex.category === categoryFilter);
    }

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
  }, [searchQuery, categoryFilter, tagFilter, exercises]);

  async function fetchExercises() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('name');

    console.log('Exercises loaded:', { count: data?.length, data, error });

    if (data) {
      setExercises(data);
      setFilteredExercises(data);

      // Extract all unique tags
      const tagsSet = new Set<string>();
      data.forEach((ex) => {
        ex.tags?.forEach((tag: string) => {
          tagsSet.add(tag);
        });
      });
      setAvailableTags(Array.from(tagsSet).sort());
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
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Exercise Library</h1>
          <p className="text-gray-400 mt-1">{exercises.length} exercises</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setManagerOpen(true)}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            ⚙️ Manage Library
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-all"
          >
            + Create Exercise
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4 items-start">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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

        {/* Category Filter */}
        <div className="w-64">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-[#0A0A0A]">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Filter */}
        <div className="w-64">
          <select
            onChange={(e) => {
              if (e.target.value && !tagFilter.includes(e.target.value)) {
                setTagFilter([...tagFilter, e.target.value]);
                e.target.value = '';
              }
            }}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
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
              className="px-3 py-1 bg-[#C9A857]/20 text-[#C9A857] rounded-full text-sm flex items-center gap-2 border border-[#C9A857]/50"
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
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Thumbnail</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Tags</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Measurements</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Created</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <tr
                  key={exercise.id}
                  onClick={() => handleEdit(exercise)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded bg-[#C9A857]/20 flex items-center justify-center text-[#C9A857] font-bold text-xs">
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
                    <span className="px-3 py-1 bg-[#C9A857]/20 text-[#C9A857] rounded-full text-xs font-medium border border-[#C9A857]/50">
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
                    <div className="flex flex-wrap gap-1">
                      {exercise.metric_schema?.measurements?.length > 0 ? (
                        exercise.metric_schema.measurements.map((m: any) => (
                          <span key={m.id} className="px-2 py-1 bg-white/5 text-gray-300 rounded text-xs border border-white/10">
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No metrics</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      {new Date(exercise.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could add dropdown menu here
                        }}
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    {searchQuery ? 'No exercises found matching your search' : 'No exercises yet. Create your first exercise!'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {managerOpen && (
        <CustomMeasurementsManager
          onClose={() => setManagerOpen(false)}
          onUpdate={() => fetchExercises()}
        />
      )}
    </div>
  );
}
