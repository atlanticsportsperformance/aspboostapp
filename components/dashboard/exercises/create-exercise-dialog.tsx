'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
}

interface CustomMeasurement {
  id: string;
  name: string;
  unit: string;
  type: 'reps' | 'performance_decimal' | 'performance_integer';
}

interface CreateExerciseDialogProps {
  exercise: Exercise | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Pre-defined measurement options
const COMMON_MEASUREMENTS = [
  { id: 'reps', name: 'Reps', type: 'integer' as const, unit: 'reps' },
  { id: 'weight', name: 'Weight', type: 'decimal' as const, unit: 'lbs' },
  { id: 'time', name: 'Time', type: 'integer' as const, unit: 'seconds' },
  { id: 'distance', name: 'Distance', type: 'decimal' as const, unit: 'feet' },
  { id: 'rpe', name: 'RPE', type: 'integer' as const, unit: '' },
];

const VELOCITY_MEASUREMENTS = [
  { id: 'exit_velo', name: 'Exit Velocity', type: 'performance_decimal' as const, unit: 'mph' },
  { id: 'peak_velo', name: 'Peak Velocity', type: 'performance_decimal' as const, unit: 'mph' },
];

const BALL_MEASUREMENTS = [
  { id: 'gray_ball_velo', name: 'Gray Ball (100g) Velocity', type: 'performance_decimal' as const, unit: 'mph' },
  { id: 'yellow_ball_velo', name: 'Yellow Ball (150g) Velocity', type: 'performance_decimal' as const, unit: 'mph' },
  { id: 'red_ball_velo', name: 'Red Ball (225g) Velocity', type: 'performance_decimal' as const, unit: 'mph' },
  { id: 'blue_ball_velo', name: 'Blue Ball (450g) Velocity', type: 'performance_decimal' as const, unit: 'mph' },
  { id: 'green_ball_velo', name: 'Green Ball (1000g) Velocity', type: 'performance_decimal' as const, unit: 'mph' },
];

const CATEGORIES = [
  { value: 'strength_conditioning', label: 'Strength + Conditioning' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
];

export function CreateExerciseDialog({ exercise, onClose, onSuccess }: CreateExerciseDialogProps) {
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('strength_conditioning');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Measurements
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const [libraryCustomMeasurements, setLibraryCustomMeasurements] = useState<CustomMeasurement[]>([]); // From library

  // Available tags from database
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  // Fetch ALL measurements from library on mount
  useEffect(() => {
    async function fetchLibraryMeasurements() {
      const supabase = createClient();

      const { data: exercises } = await supabase
        .from('exercises')
        .select('metric_schema, tags')
        .eq('is_active', true);

      if (!exercises) return;

      console.log('[Exercise Creator] Fetching measurements from DB...');

      // Extract ALL unique measurements from the database
      const measurementsMap = new Map<string, CustomMeasurement>();

      exercises.forEach((ex) => {
        const measurements = ex.metric_schema?.measurements || [];
        measurements.forEach((m: any) => {
          if (!measurementsMap.has(m.id)) {
            measurementsMap.set(m.id, {
              id: m.id,
              name: m.name,
              unit: m.unit || '',
              type: m.type || 'decimal',
            });
          }
        });
      });

      const allMeasurements = Array.from(measurementsMap.values());
      console.log('[Exercise Creator] Found measurements:', allMeasurements);
      setLibraryCustomMeasurements(allMeasurements);

      // Extract ALL unique tags from the database
      const tagsSet = new Set<string>();
      exercises.forEach((ex) => {
        ex.tags?.forEach((tag: string) => {
          tagsSet.add(tag);
        });
      });

      const allTags = Array.from(tagsSet).sort();
      console.log('[Exercise Creator] Found tags:', allTags);
      setAvailableTags(allTags);
    }

    fetchLibraryMeasurements();
  }, []);

  // Load exercise data if editing
  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setCategory(exercise.category);
      setSelectedTags(exercise.tags || []);
      setDescription(exercise.description || '');
      setVideoUrl(exercise.video_url || '');

      // Load measurements
      if (exercise.metric_schema?.measurements) {
        const selected = exercise.metric_schema.measurements.map((m: any) => m.id);
        setSelectedMeasurements(selected);
      }
    }
  }, [exercise]);

  function toggleMeasurement(id: string) {
    if (selectedMeasurements.includes(id)) {
      setSelectedMeasurements(selectedMeasurements.filter(m => m !== id));
    } else {
      setSelectedMeasurements([...selectedMeasurements, id]);
    }
  }

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  }

  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter an exercise name');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Build metric_schema - use ONLY measurements from library
    const enabledMeasurements = libraryCustomMeasurements
      .filter(m => selectedMeasurements.includes(m.id))
      .map(m => ({ ...m, enabled: true }));

    const metric_schema = {
      measurements: enabledMeasurements,
    };

    const exerciseData = {
      name: name.trim(),
      category: category,
      tags: selectedTags,
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      metric_schema: metric_schema,
      is_active: true,
    };

    let error;

    if (exercise) {
      // Update existing
      const result = await supabase
        .from('exercises')
        .update(exerciseData)
        .eq('id', exercise.id);
      error = result.error;
    } else {
      // Create new
      const result = await supabase.from('exercises').insert(exerciseData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving exercise:', error);
      alert('Failed to save exercise: ' + error.message);
      setLoading(false);
    } else {
      console.log('Exercise saved successfully');
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {exercise ? 'Edit Exercise' : 'Create Exercise'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* GENERAL SECTION */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
              General
            </h3>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
                placeholder="e.g., Back Squat"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-[#0A0A0A]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tags (optional, select all that apply)
              </label>

              {/* Selected tags display */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#C9A857]/20 text-[#C9A857] rounded-full text-sm flex items-center gap-2 border border-[#C9A857]/50"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag dropdown selector */}
              {availableTags.length > 0 ? (
                <div className="mb-3">
                  <select
                    onChange={(e) => {
                      if (e.target.value && !selectedTags.includes(e.target.value)) {
                        setSelectedTags([...selectedTags, e.target.value]);
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-[#0A0A0A]">
                      Select tags to add...
                    </option>
                    {availableTags
                      .filter(tag => !selectedTags.includes(tag))
                      .map((tag) => (
                        <option key={tag} value={tag} className="bg-[#0A0A0A] capitalize">
                          {tag}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="mb-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-300 text-sm text-center">
                    No tags available yet. Create tags in <strong>Manage Tags</strong> section.
                  </p>
                </div>
              )}
            </div>

            {/* Exercise Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Exercise Notes (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857] resize-none"
                rows={3}
                placeholder="Notes about how to perform the exercise..."
              />
            </div>

            {/* Video URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Video URL (optional)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          {/* MEASUREMENTS SECTION */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
              Measurements
            </h3>

            <p className="text-sm text-gray-400 mb-4">
              Choose measurements to track. All measurements come from the Library Manager.
            </p>

            {/* All Measurements from Library */}
            {libraryCustomMeasurements.length > 0 ? (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">AVAILABLE MEASUREMENTS:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {libraryCustomMeasurements.map((measurement) => (
                    <label
                      key={measurement.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMeasurements.includes(measurement.id)}
                        onChange={() => toggleMeasurement(measurement.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-white">
                        {measurement.name} {measurement.unit && `(${measurement.unit})`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-300 text-sm text-center">
                  No measurements available yet. Open <strong>Library Manager (⚙️)</strong> to create measurements first.
                </p>
              </div>
            )}

          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#C9A857] text-black font-semibold rounded-lg hover:bg-[#B89647] transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : exercise ? 'Update Exercise' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
