'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Routine {
  id: string;
  name: string;
  scheme: string;
  description: string | null;
  routine_exercises: {
    id: string;
  }[];
}

interface ImportRoutineDialogProps {
  onImport: (routineId: string) => void;
  onClose: () => void;
}

export default function ImportRoutineDialog({ onImport, onClose }: ImportRoutineDialogProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    fetchRoutines();
  }, []);

  async function fetchRoutines() {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (id)
      `)
      .eq('is_standalone', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routines:', error);
    } else {
      setRoutines(data || []);
    }

    setLoading(false);
  }

  const filteredRoutines = routines.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScheme = schemeFilter === 'all' || r.scheme === schemeFilter;
    return matchesSearch && matchesScheme;
  });

  const getSchemeBadge = (scheme: string) => {
    const schemes: Record<string, { label: string; color: string }> = {
      straight: { label: 'Straight Sets', color: 'bg-gray-500/20 text-gray-300' },
      superset: { label: 'Superset', color: 'bg-blue-500/20 text-blue-300' },
      circuit: { label: 'Circuit', color: 'bg-purple-500/20 text-purple-300' },
      emom: { label: 'EMOM', color: 'bg-green-500/20 text-green-300' },
      amrap: { label: 'AMRAP', color: 'bg-yellow-500/20 text-yellow-300' },
      giant_set: { label: 'Giant Set', color: 'bg-red-500/20 text-red-300' }
    };
    const config = schemes[scheme] || schemes.straight;
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Import Routine</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search routines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={schemeFilter}
              onChange={(e) => setSchemeFilter(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Schemes</option>
              <option value="straight">Straight Sets</option>
              <option value="superset">Superset</option>
              <option value="circuit">Circuit</option>
              <option value="emom">EMOM</option>
              <option value="amrap">AMRAP</option>
              <option value="giant_set">Giant Set</option>
            </select>
          </div>
        </div>

        {/* Routine List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading routines...</div>
          ) : filteredRoutines.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchQuery || schemeFilter !== 'all' ? 'No routines found' : 'No routines available'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRoutines.map((routine) => {
                const exerciseCount = routine.routine_exercises?.length || 0;

                return (
                  <button
                    key={routine.id}
                    onClick={() => onImport(routine.id)}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium">{routine.name}</h3>
                      {getSchemeBadge(routine.scheme)}
                    </div>

                    {routine.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {routine.description}
                      </p>
                    )}

                    <div className="text-sm text-gray-400">
                      {exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
