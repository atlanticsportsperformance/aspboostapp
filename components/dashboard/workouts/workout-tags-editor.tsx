'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface WorkoutTagsEditorProps {
  tags: string[];
  onUpdate: (tags: string[]) => void;
}

export default function WorkoutTagsEditor({ tags, onUpdate }: WorkoutTagsEditorProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  async function fetchAvailableTags() {
    const supabase = createClient();

    // Fetch all tags from workout_tags table
    const { data: workoutTags, error } = await supabase
      .from('workout_tags')
      .select('name')
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    setAvailableTags(workoutTags?.map(t => t.name) || []);
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onUpdate([...tags, trimmedTag]);
      setNewTagInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(newTagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-neutral-400 shrink-0">Tags:</label>

      {/* Current Tags */}
      <div className="flex flex-wrap gap-1.5 flex-1">
        {tags.length === 0 ? (
          <span className="text-xs text-neutral-500 italic">None</span>
        ) : (
          tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-900/50 border border-neutral-700 rounded-sm text-xs text-neutral-300"
            >
              <span>{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-white transition-colors text-neutral-400"
                title="Remove tag"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Custom Tag Input */}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add tag..."
          className="w-24 px-2 py-1 bg-neutral-950/50 border border-neutral-700 rounded-sm text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
        />
        <button
          onClick={() => addTag(newTagInput)}
          disabled={!newTagInput.trim()}
          className="px-2 py-1 bg-neutral-800/50 border border-neutral-600 hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-sm transition-colors"
        >
          Add
        </button>
      </div>

      {/* Add Tag Dropdown (if predefined tags exist) */}
      {availableTags.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              addTag(e.target.value);
              e.target.value = '';
            }
          }}
          className="px-2 py-1 bg-neutral-950/50 border border-neutral-700 rounded-sm text-white text-xs focus:outline-none focus:border-neutral-500 transition-colors shrink-0 [&>option]:bg-neutral-900 [&>option]:text-white"
          defaultValue=""
        >
          <option value="" disabled>
            Select tag...
          </option>
          {availableTags
            .filter(tag => !tags.includes(tag))
            .map((tag) => (
              <option key={tag} value={tag} className="capitalize">
                {tag}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
