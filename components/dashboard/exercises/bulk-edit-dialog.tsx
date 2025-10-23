'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BulkEditDialogProps {
  exerciseIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'strength_conditioning', label: 'Strength + Conditioning' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
];

export function BulkEditDialog({ exerciseIds, onClose, onSuccess }: BulkEditDialogProps) {
  const [category, setCategory] = useState('');
  const [selectedTagsToAdd, setSelectedTagsToAdd] = useState<string[]>([]);
  const [selectedTagsToRemove, setSelectedTagsToRemove] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  async function fetchAvailableTags() {
    const supabase = createClient();
    const { data } = await supabase
      .from('exercises')
      .select('tags')
      .eq('is_active', true);

    if (data) {
      const tagsSet = new Set<string>();
      data.forEach((ex) => {
        ex.tags?.forEach((tag: string) => {
          tagsSet.add(tag);
        });
      });
      setAvailableTags(Array.from(tagsSet).sort());
    }
  }

  async function handleSave() {
    if (!category && selectedTagsToAdd.length === 0 && selectedTagsToRemove.length === 0) {
      alert('Please select at least one field to update');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      // If category is selected, update it
      if (category) {
        const { error } = await supabase
          .from('exercises')
          .update({ category })
          .in('id', exerciseIds);

        if (error) throw error;
      }

      // Handle tags
      if (selectedTagsToAdd.length > 0 || selectedTagsToRemove.length > 0) {
        // Fetch current exercises to modify tags
        const { data: exercises, error: fetchError } = await supabase
          .from('exercises')
          .select('id, tags')
          .in('id', exerciseIds);

        if (fetchError) throw fetchError;

        // Update each exercise's tags
        for (const exercise of exercises || []) {
          let currentTags = exercise.tags || [];

          // Remove tags
          if (selectedTagsToRemove.length > 0) {
            currentTags = currentTags.filter(tag => !selectedTagsToRemove.includes(tag));
          }

          // Add tags
          if (selectedTagsToAdd.length > 0) {
            selectedTagsToAdd.forEach(tag => {
              if (!currentTags.includes(tag)) {
                currentTags.push(tag);
              }
            });
          }

          const { error: updateError } = await supabase
            .from('exercises')
            .update({ tags: currentTags })
            .eq('id', exercise.id);

          if (updateError) throw updateError;
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error bulk editing exercises:', error);
      alert('Failed to update exercises');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Bulk Edit Exercises</h2>
            <p className="text-sm text-neutral-400 mt-1">Editing {exerciseIds.length} exercise(s)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Update Category
              <span className="text-neutral-500 text-xs ml-2">(optional)</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900"
            >
              <option value="">Don't change category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Add Tags
              <span className="text-neutral-500 text-xs ml-2">(optional)</span>
            </label>
            <select
              onChange={(e) => {
                if (e.target.value && !selectedTagsToAdd.includes(e.target.value)) {
                  setSelectedTagsToAdd([...selectedTagsToAdd, e.target.value]);
                  e.target.value = '';
                }
              }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900"
              defaultValue=""
            >
              <option value="" disabled>Select tags to add...</option>
              {availableTags
                .filter(tag => !selectedTagsToAdd.includes(tag))
                .map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
            </select>
            {selectedTagsToAdd.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTagsToAdd.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex items-center gap-2 border border-green-500/50"
                  >
                    {tag}
                    <button
                      onClick={() => setSelectedTagsToAdd(selectedTagsToAdd.filter(t => t !== tag))}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-1">These tags will be added to all selected exercises</p>
          </div>

          {/* Remove Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Remove Tags
              <span className="text-neutral-500 text-xs ml-2">(optional)</span>
            </label>
            <select
              onChange={(e) => {
                if (e.target.value && !selectedTagsToRemove.includes(e.target.value)) {
                  setSelectedTagsToRemove([...selectedTagsToRemove, e.target.value]);
                  e.target.value = '';
                }
              }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-neutral-900"
              defaultValue=""
            >
              <option value="" disabled>Select tags to remove...</option>
              {availableTags
                .filter(tag => !selectedTagsToRemove.includes(tag))
                .map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
            </select>
            {selectedTagsToRemove.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTagsToRemove.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm flex items-center gap-2 border border-red-500/50"
                  >
                    {tag}
                    <button
                      onClick={() => setSelectedTagsToRemove(selectedTagsToRemove.filter(t => t !== tag))}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-1">These tags will be removed from all selected exercises</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Bulk Edit Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                  <li>Leave fields blank to keep existing values</li>
                  <li>Category change will apply to all selected exercises</li>
                  <li>Tags are added/removed independently from each exercise</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : `Update ${exerciseIds.length} Exercise(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
