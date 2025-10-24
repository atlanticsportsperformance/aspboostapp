'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PlanTagsEditorProps {
  tags: string[];
  onUpdate: (tags: string[]) => void;
}

export default function PlanTagsEditor({ tags, onUpdate }: PlanTagsEditorProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  async function fetchAvailableTags() {
    const supabase = createClient();

    // Fetch all tags from plan_tags table
    const { data: planTags, error } = await supabase
      .from('plan_tags')
      .select('name')
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    setAvailableTags(planTags?.map(t => t.name) || []);
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onUpdate([...tags, trimmedTag]);
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

      {/* Add Tag Dropdown - only from predefined tags */}
      <select
        onChange={(e) => {
          if (e.target.value) {
            addTag(e.target.value);
            e.target.value = '';
          }
        }}
        className="px-2 py-1 bg-neutral-950/50 border border-neutral-700 rounded-sm text-white text-xs focus:outline-none focus:border-neutral-500 transition-colors shrink-0 [&>option]:bg-neutral-900 [&>option]:text-white"
        defaultValue=""
        disabled={availableTags.length === 0}
      >
        <option value="" disabled>
          {availableTags.length === 0 ? 'No tags available' : 'Select tag...'}
        </option>
        {availableTags
          .filter(tag => !tags.includes(tag))
          .map((tag) => (
            <option key={tag} value={tag} className="capitalize">
              {tag}
            </option>
          ))}
      </select>
    </div>
  );
}
