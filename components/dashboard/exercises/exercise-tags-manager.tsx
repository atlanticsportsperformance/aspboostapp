'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ExerciseTag {
  id: string;
  name: string;
  category: 'throwing' | 'hitting' | 'strength_conditioning';
  created_at: string;
}

interface ExerciseTagsManagerProps {
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'strength_conditioning', label: 'Strength + Conditioning' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'throwing', label: 'Throwing' },
];

export function ExerciseTagsManager({ onClose }: ExerciseTagsManagerProps) {
  const [activeTab, setActiveTab] = useState<'strength_conditioning' | 'hitting' | 'throwing'>('strength_conditioning');
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [createTagName, setCreateTagName] = useState('');
  const [editingTag, setEditingTag] = useState<ExerciseTag | null>(null);
  const [editName, setEditName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    setLoading(true);

    const { data, error } = await supabase
      .from('exercise_tags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setTags(data || []);
    }

    setLoading(false);
  }

  async function handleCreateTag() {
    if (!createTagName.trim()) {
      alert('Please enter a tag name');
      return;
    }

    const { error } = await supabase
      .from('exercise_tags')
      .insert({
        name: createTagName.trim().toLowerCase(),
        category: activeTab
      });

    if (error) {
      if (error.code === '23505') {
        alert(`Tag "${createTagName}" already exists for ${CATEGORIES.find(c => c.value === activeTab)?.label}`);
      } else {
        console.error('Error creating tag:', error);
        alert('Failed to create tag');
      }
      return;
    }

    setCreateTagName('');
    setShowCreateTag(false);
    fetchTags();
  }

  async function handleUpdateTag() {
    if (!editingTag || !editName.trim()) return;

    const { error } = await supabase
      .from('exercise_tags')
      .update({ name: editName.trim().toLowerCase() })
      .eq('id', editingTag.id);

    if (error) {
      if (error.code === '23505') {
        alert(`Tag "${editName}" already exists for this category`);
      } else {
        console.error('Error updating tag:', error);
        alert('Failed to update tag');
      }
      return;
    }

    setEditingTag(null);
    setEditName('');
    fetchTags();
  }

  async function handleDeleteTag(tagId: string, tagName: string) {
    if (!confirm(`Delete tag "${tagName}"? This won't affect exercises that already use this tag.`)) {
      return;
    }

    const { error } = await supabase
      .from('exercise_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag');
      return;
    }

    fetchTags();
  }

  const currentCategoryTags = tags.filter(tag => tag.category === activeTab);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Exercise Tags</h2>
              <p className="text-sm text-gray-400 mt-1">
                Manage category-specific tags
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

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value as any)}
              className={`px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === cat.value
                  ? 'text-[#C9A857] border-[#C9A857]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
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
                  <h4 className="text-white font-semibold mb-2">Create New Tag</h4>
                  <p className="text-xs text-gray-400 mb-4">
                    Tags help organize and filter exercises within {CATEGORIES.find(c => c.value === activeTab)?.label}.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tag Name *</label>
                      <input
                        type="text"
                        value={createTagName}
                        onChange={(e) => setCreateTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateTag();
                          if (e.key === 'Escape') {
                            setShowCreateTag(false);
                            setCreateTagName('');
                          }
                        }}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., velocity, arm-care, rotational"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateTag}
                        disabled={!createTagName.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/30 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                      >
                        Create Tag
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateTag(false);
                          setCreateTagName('');
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateTag(true)}
                  className="w-full px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Tag
                </button>
              )}

              {/* Tags List */}
              {currentCategoryTags.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-gray-400 mb-2">No tags found</p>
                  <p className="text-gray-500 text-sm">Create your first tag for {CATEGORIES.find(c => c.value === activeTab)?.label}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentCategoryTags.map(tag => (
                    <div
                      key={tag.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all group"
                    >
                      {editingTag?.id === tag.id ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateTag();
                                if (e.key === 'Escape') {
                                  setEditingTag(null);
                                  setEditName('');
                                }
                              }}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A857]"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={handleUpdateTag}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                            title="Save"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingTag(null);
                              setEditName('');
                            }}
                            className="p-2 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded transition-colors"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded">
                              <svg className="w-4 h-4 text-[#C9A857]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <span className="text-white font-medium capitalize">{tag.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingTag(tag);
                                setEditName(tag.name);
                              }}
                              className="p-2 bg-white/10 hover:bg-blue-600/20 text-blue-400 rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTag(tag.id, tag.name)}
                              className="p-2 bg-white/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
