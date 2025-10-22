'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  onAdd: (exerciseId: string, isPlaceholder: boolean, placeholderId?: string, placeholderName?: string, categoryHint?: string) => void;
}

export function AddExerciseDialog({ workout, onClose, onAdd }: AddExerciseDialogProps) {
  const [mode, setMode] = useState<'direct' | 'placeholder'>('direct');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderCategory, setPlaceholderCategory] = useState('strength_conditioning');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (mode === 'direct') {
      fetchExercises();
    }
  }, [mode]);

  async function fetchExercises() {
    setLoading(true);

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching exercises:', error);
    } else {
      setExercises(data || []);
    }

    setLoading(false);
  }

  async function handleAddDirect() {
    if (!selectedExercise) {
      alert('Please select an exercise');
      return;
    }

    onAdd(selectedExercise, false);
    onClose();
  }

  async function handleAddPlaceholder() {
    if (!placeholderName.trim()) {
      alert('Please enter a placeholder name');
      return;
    }

    const placeholderId = `ph_${Date.now()}`;

    // Pass placeholder data to parent component - it will handle saving to database
    onAdd('', true, placeholderId, placeholderName.trim(), placeholderCategory);
    onClose();
  }

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
    return matchesSearch && matchesCategory;
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="strength_conditioning">Strength + Conditioning</option>
                  <option value="hitting">Hitting</option>
                  <option value="throwing">Throwing</option>
                </select>
              </div>

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
                        selectedExercise === exercise.id
                          ? 'bg-blue-500/20 border-blue-500'
                          : 'bg-white/5 hover:bg-white/10 border-transparent'
                      } border`}
                    >
                      <input
                        type="radio"
                        name="exercise"
                        value={exercise.id}
                        checked={selectedExercise === exercise.id}
                        onChange={() => setSelectedExercise(exercise.id)}
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
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Placeholder Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Throwing Exercise, Corrective 1"
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Category Hint
                </label>
                <select
                  value={placeholderCategory}
                  onChange={(e) => setPlaceholderCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="strength_conditioning">Strength + Conditioning</option>
                  <option value="hitting">Hitting</option>
                  <option value="throwing">Throwing</option>
                </select>
                <p className="mt-2 text-xs text-gray-400">
                  This helps filter exercises when selecting a placeholder later
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>What is a placeholder?</strong><br />
                  A placeholder creates a slot that can be filled with different exercises for each
                  athlete. Perfect for personalized programs where athletes need different exercises
                  based on their needs.
                </p>
              </div>
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
            {mode === 'direct' ? 'Add Exercise' : 'Add Placeholder'}
          </button>
        </div>
      </div>
    </div>
  );
}
