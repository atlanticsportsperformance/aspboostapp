'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ViewType {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  org_id: string;
}

export default function AthleteViewTypesTab() {
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchViewTypes();
  }, []);

  async function fetchViewTypes() {
    setLoading(true);

    try {
      console.log('Fetching all view types for admin...');

      // Fetch all view types (admin can see all orgs' view types)
      // In the future, you can filter by org_id if needed
      const { data, error } = await supabase
        .from('athlete_view_types')
        .select('*')
        .eq('is_active', true)
        .order('org_id')
        .order('display_order');

      if (error) {
        console.error('Error fetching view types:', error);
      } else {
        console.log('Fetched view types:', data);
        setViewTypes(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('athlete_view_types')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating view type:', error);
      alert('Failed to update view type');
    } else {
      setMessage('✅ View type updated successfully!');
      setTimeout(() => setMessage(''), 3000);
      setEditingId(null);
      fetchViewTypes();
    }

    setSaving(false);
  }

  function startEdit(viewType: ViewType) {
    setEditingId(viewType.id);
    setEditName(viewType.name);
    setEditDescription(viewType.description || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading view types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Athlete View Types</h3>
        <p className="text-sm text-gray-400 mb-6">
          Customize the names and descriptions of athlete view types. These categories help organize different types of athletes in your facility.
        </p>

        {/* Success Message */}
        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
            {message}
          </div>
        )}

        {/* View Types List */}
        <div className="space-y-3">
          {viewTypes.map((viewType) => (
            <div
              key={viewType.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5"
            >
              {editingId === viewType.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      View Type Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                      placeholder="e.g., Two Way Performance"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] resize-none"
                      placeholder="Brief description of this athlete type"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSaveEdit(viewType.id)}
                      disabled={saving}
                      className="px-4 py-2 bg-[#9BDDFF] text-black rounded-lg hover:bg-[#7BC5F0] disabled:opacity-50 transition-colors font-medium text-sm"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#9BDDFF]/10 text-[#9BDDFF] font-bold text-sm">
                        {viewType.display_order}
                      </span>
                      <h4 className="text-lg font-semibold text-white">
                        {viewType.name}
                      </h4>
                    </div>
                    {viewType.description && (
                      <p className="text-sm text-gray-400 ml-11">
                        {viewType.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => startEdit(viewType)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-4 flex-shrink-0"
                    title="Edit view type"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">About Athlete View Types</p>
              <p className="text-blue-300/80">
                These view types allow you to categorize athletes based on their training focus. You can assign each athlete to a view type in their individual Settings tab. In the future, this will enable customized dashboards and data displays for each athlete type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
