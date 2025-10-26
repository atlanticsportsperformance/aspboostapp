'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TagUsage {
  name: string;
  count: number;
}

interface WorkoutTagsManagerProps {
  onClose: () => void;
  onUpdate: () => void;
}

export function WorkoutTagsManager({ onClose, onUpdate }: WorkoutTagsManagerProps) {
  const [tags, setTags] = useState<TagUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [createTagName, setCreateTagName] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    const supabase = createClient();

    // Fetch all tags from workout_tags table
    const { data: workoutTags, error: tagsError } = await supabase
      .from('workout_tags')
      .select('name')
      .order('name');

    if (tagsError) {
      console.error('Error fetching workout tags:', tagsError);
      setLoading(false);
      return;
    }

    // Fetch all workouts to count usage
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('tags');

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      setLoading(false);
      return;
    }

    // Count usage for each tag
    const usageMap = new Map<string, number>();
    workouts?.forEach((workout) => {
      workout.tags?.forEach((tag: string) => {
        const count = usageMap.get(tag) || 0;
        usageMap.set(tag, count + 1);
      });
    });

    // Build tag list with usage counts
    const tagList: TagUsage[] = workoutTags?.map((tag) => ({
      name: tag.name,
      count: usageMap.get(tag.name) || 0,
    })) || [];

    setTags(tagList);
    setLoading(false);
  }

  async function handleDeleteTag(tagName: string) {
    const tag = tags.find(t => t.name === tagName);
    if (!tag) return;

    const message = tag.count > 0
      ? `This will remove the "${tagName}" tag from ${tag.count} workout${tag.count !== 1 ? 's' : ''} and delete it from the library. Continue?`
      : `Delete the "${tagName}" tag from the library?`;

    if (!confirm(message)) return;

    const supabase = createClient();

    // If tag is used in workouts, remove it from them first
    if (tag.count > 0) {
      const { data: workouts, error: fetchError } = await supabase
        .from('workouts')
        .select('id, tags');

      if (fetchError) {
        console.error('Error fetching workouts:', fetchError);
        alert('Failed to delete tag');
        return;
      }

      // Update each workout to remove this tag
      const updates = workouts
        ?.filter((workout) => workout.tags?.includes(tagName))
        .map(async (workout) => {
          const updatedTags = workout.tags.filter((t: string) => t !== tagName);
          const { error } = await supabase
            .from('workouts')
            .update({ tags: updatedTags })
            .eq('id', workout.id);
          return error;
        });

      const results = await Promise.all(updates || []);
      const hasErrors = results.some((err) => err !== null && err !== undefined);

      if (hasErrors) {
        alert('Some workouts failed to update');
        return;
      }
    }

    // Delete from workout_tags table
    const { error: deleteError } = await supabase
      .from('workout_tags')
      .delete()
      .eq('name', tagName);

    if (deleteError) {
      console.error('Error deleting tag:', deleteError);
      alert('Failed to delete tag');
    } else {
      fetchTags();
      onUpdate();
    }
  }

  function startEditTag(tagName: string) {
    setEditingTag(tagName);
    setEditTagName(tagName);
  }

  async function saveEditTag(oldName: string) {
    const newName = editTagName.trim().toLowerCase();

    if (!newName) {
      alert('Tag name is required');
      return;
    }

    if (newName === oldName) {
      setEditingTag(null);
      return;
    }

    const supabase = createClient();

    // Update the tag in workout_tags table
    const { error: updateTagError } = await supabase
      .from('workout_tags')
      .update({ name: newName })
      .eq('name', oldName);

    if (updateTagError) {
      console.error('Error updating tag:', updateTagError);
      alert('Failed to update tag');
      return;
    }

    // Fetch all workouts with this tag
    const { data: workouts, error: fetchError } = await supabase
      .from('workouts')
      .select('id, tags');

    if (fetchError) {
      console.error('Error fetching workouts:', fetchError);
      alert('Failed to update tag in workouts');
      return;
    }

    // Update each workout to rename this tag
    const updates = workouts
      ?.filter((workout) => workout.tags?.includes(oldName))
      .map(async (workout) => {
        const updatedTags = workout.tags.map((t: string) => t === oldName ? newName : t);
        const { error } = await supabase
          .from('workouts')
          .update({ tags: updatedTags })
          .eq('id', workout.id);
        return error;
      });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== null && err !== undefined);

    if (hasErrors) {
      alert('Some workouts failed to update');
    } else {
      setEditingTag(null);
      fetchTags();
      onUpdate();
    }
  }

  async function createCustomTag() {
    if (!createTagName.trim()) {
      alert('Tag name is required');
      return;
    }

    const newTagName = createTagName.trim().toLowerCase();

    // Check if already exists
    if (tags.some(t => t.name === newTagName)) {
      alert('This tag already exists');
      return;
    }

    const supabase = createClient();

    // Insert into workout_tags table
    const { error } = await supabase
      .from('workout_tags')
      .insert({ name: newTagName });

    if (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
      return;
    }

    // Reset form
    setShowCreateTag(false);
    setCreateTagName('');

    // Refresh tags list
    fetchTags();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Workout Tags Manager</h2>
              <p className="text-sm text-gray-400 mt-1">
                Manage tags for categorizing workouts
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-4">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Create New Tag Button/Form */}
              {showCreateTag ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-3">Create New Workout Tag</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tag Name *</label>
                      <input
                        type="text"
                        value={createTagName}
                        onChange={(e) => setCreateTagName(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., strength, deload, competition-prep"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createCustomTag}
                        className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateTag(false);
                          setCreateTagName('');
                        }}
                        className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateTag(true)}
                  className="w-full px-4 py-3 bg-[#9BDDFF]/20 border border-[#9BDDFF]/50 text-[#9BDDFF] rounded-lg hover:bg-[#9BDDFF]/30 transition-all font-medium"
                >
                  + Create New Workout Tag
                </button>
              )}

              {/* List of tags */}
              {tags.length === 0 && !showCreateTag ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No workout tags yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Click the button above to create your first workout tag
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tags.map((tag) => (
                    <div
                      key={tag.name}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                    >
                      {editingTag === tag.name ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tag Name</label>
                            <input
                              type="text"
                              value={editTagName}
                              onChange={(e) => setEditTagName(e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                              placeholder="Enter tag name..."
                            />
                          </div>
                          <div className="text-xs text-gray-400">
                            Used by {tag.count} workout{tag.count !== 1 ? 's' : ''}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => saveEditTag(tag.name)}
                              className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTag(null)}
                              className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-semibold text-lg capitalize">{tag.name}</h3>
                            </div>
                            <div className="text-sm text-gray-400">
                              {tag.count} workout{tag.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditTag(tag.name)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-all group"
                              title="Edit tag"
                            >
                              <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTag(tag.name)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-all group"
                              title="Delete tag"
                            >
                              <svg className="w-5 h-5 text-red-400 group-hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
