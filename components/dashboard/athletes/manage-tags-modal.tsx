'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ManageTagsModalProps {
  athleteId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageTagsModal({ athleteId, onClose, onSuccess }: ManageTagsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [planTags, setPlanTags] = useState<string[]>([]);
  const [workoutTags, setWorkoutTags] = useState<string[]>([]);
  const [routineTags, setRoutineTags] = useState<string[]>([]);
  const [exerciseTags, setExerciseTags] = useState<string[]>([]);

  const [selectedPlanTags, setSelectedPlanTags] = useState<Set<string>>(new Set());
  const [selectedWorkoutTags, setSelectedWorkoutTags] = useState<Set<string>>(new Set());
  const [selectedRoutineTags, setSelectedRoutineTags] = useState<Set<string>>(new Set());
  const [selectedExerciseTags, setSelectedExerciseTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTagsData();
  }, [athleteId]);

  async function fetchTagsData() {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch all plan tags
      const { data: planTagsData } = await supabase
        .from('plan_tags')
        .select('name')
        .order('name');

      // Fetch all workout tags
      const { data: workoutTagsData } = await supabase
        .from('workout_tags')
        .select('name')
        .order('name');

      // Fetch all routine tags
      const { data: routineTagsData } = await supabase
        .from('routine_tags')
        .select('name')
        .order('name');

      // Fetch all exercise tags
      const { data: exerciseTagsData } = await supabase
        .from('exercise_tags')
        .select('name')
        .order('name');

      setPlanTags((planTagsData || []).map(t => t.name));
      setWorkoutTags((workoutTagsData || []).map(t => t.name));
      setRoutineTags((routineTagsData || []).map(t => t.name));
      setExerciseTags((exerciseTagsData || []).map(t => t.name));

      // Fetch current athlete tags
      const { data: athleteTagsData } = await supabase
        .from('athlete_tags')
        .select('tag_name, tag_type')
        .eq('athlete_id', athleteId);

      // Organize by type
      const athletePlanTags = new Set<string>();
      const athleteWorkoutTags = new Set<string>();
      const athleteRoutineTags = new Set<string>();
      const athleteExerciseTags = new Set<string>();

      (athleteTagsData || []).forEach(at => {
        if (at.tag_type === 'plan') athletePlanTags.add(at.tag_name);
        if (at.tag_type === 'workout') athleteWorkoutTags.add(at.tag_name);
        if (at.tag_type === 'routine') athleteRoutineTags.add(at.tag_name);
        if (at.tag_type === 'exercise') athleteExerciseTags.add(at.tag_name);
      });

      setSelectedPlanTags(athletePlanTags);
      setSelectedWorkoutTags(athleteWorkoutTags);
      setSelectedRoutineTags(athleteRoutineTags);
      setSelectedExerciseTags(athleteExerciseTags);

    } catch (error) {
      console.error('Error fetching tags data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const supabase = createClient();
    setSaving(true);

    try {
      // Delete all existing athlete tags
      await supabase
        .from('athlete_tags')
        .delete()
        .eq('athlete_id', athleteId);

      // Build new tags array
      const newTags = [];

      selectedPlanTags.forEach(tag => {
        newTags.push({
          athlete_id: athleteId,
          tag_name: tag,
          tag_type: 'plan'
        });
      });

      selectedWorkoutTags.forEach(tag => {
        newTags.push({
          athlete_id: athleteId,
          tag_name: tag,
          tag_type: 'workout'
        });
      });

      selectedRoutineTags.forEach(tag => {
        newTags.push({
          athlete_id: athleteId,
          tag_name: tag,
          tag_type: 'routine'
        });
      });

      selectedExerciseTags.forEach(tag => {
        newTags.push({
          athlete_id: athleteId,
          tag_name: tag,
          tag_type: 'exercise'
        });
      });

      // Insert new tags
      if (newTags.length > 0) {
        const { error } = await supabase
          .from('athlete_tags')
          .insert(newTags);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving tags:', error);
      alert('Failed to save tags');
    } finally {
      setSaving(false);
    }
  }

  const toggleTag = (tag: string, type: 'plan' | 'workout' | 'routine' | 'exercise') => {
    if (type === 'plan') {
      const newSet = new Set(selectedPlanTags);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      setSelectedPlanTags(newSet);
    } else if (type === 'workout') {
      const newSet = new Set(selectedWorkoutTags);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      setSelectedWorkoutTags(newSet);
    } else if (type === 'routine') {
      const newSet = new Set(selectedRoutineTags);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      setSelectedRoutineTags(newSet);
    } else if (type === 'exercise') {
      const newSet = new Set(selectedExerciseTags);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      setSelectedExerciseTags(newSet);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto pt-20 pb-20">
      <div className="bg-[#1A1A1A] rounded-xl border border-white/10 w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Manage Tags</h2>
              <p className="text-gray-400 text-xs mt-1">Organize content by tags</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 text-sm">Loading tags...</div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Plan Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#C9A857]">PLANS</h3>
                  <span className="text-xs text-gray-500">({selectedPlanTags.size})</span>
                </div>
                {planTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {planTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, 'plan')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                          selectedPlanTags.has(tag)
                            ? 'bg-[#C9A857] text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No plan tags available</p>
                )}
              </div>

              {/* Workout Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#C9A857]">WORKOUTS</h3>
                  <span className="text-xs text-gray-500">({selectedWorkoutTags.size})</span>
                </div>
                {workoutTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {workoutTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, 'workout')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                          selectedWorkoutTags.has(tag)
                            ? 'bg-[#C9A857] text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No workout tags available</p>
                )}
              </div>

              {/* Routine Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#C9A857]">ROUTINES</h3>
                  <span className="text-xs text-gray-500">({selectedRoutineTags.size})</span>
                </div>
                {routineTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {routineTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, 'routine')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                          selectedRoutineTags.has(tag)
                            ? 'bg-[#C9A857] text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No routine tags available</p>
                )}
              </div>

              {/* Exercise Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#C9A857]">EXERCISES</h3>
                  <span className="text-xs text-gray-500">({selectedExerciseTags.size})</span>
                </div>
                {exerciseTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {exerciseTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, 'exercise')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                          selectedExerciseTags.has(tag)
                            ? 'bg-[#C9A857] text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No exercise tags available</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
          <div className="text-xs text-gray-400">
            {selectedPlanTags.size + selectedWorkoutTags.size + selectedRoutineTags.size + selectedExerciseTags.size} total selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-[#C9A857] hover:bg-[#B89647] text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
