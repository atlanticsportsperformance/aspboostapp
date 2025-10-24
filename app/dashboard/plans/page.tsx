'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlanTagsManager } from '@/components/dashboard/plans/plan-tags-manager';

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function PlansPage() {
  const router = useRouter();
  const supabase = createClient();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }

  async function handleCreatePlan() {
    if (!newPlanName.trim()) {
      alert('Please enter a plan name');
      return;
    }

    // Get current user's organization_id from staff table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a plan');
      return;
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (staffError || !staffData) {
      console.error('Error fetching staff org:', staffError);
      alert('Unable to determine your organization. Please contact support.');
      return;
    }

    const { data, error } = await supabase
      .from('training_plans')
      .insert({
        name: newPlanName.trim(),
        organization_id: staffData.org_id,
        description: null,
        start_date: null,
        end_date: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      alert('Failed to create plan');
    } else {
      setNewPlanName('');
      setShowCreateDialog(false);
      // Navigate to the new plan's calendar
      router.push(`/dashboard/plans/${data.id}`);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm('Delete this plan? This will also delete all associated workouts and routines.')) return;

    const { error } = await supabase
      .from('training_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan');
    } else {
      fetchPlans();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Training Plans</h1>
              <p className="text-neutral-400">Create and manage your training programs</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setManagerOpen(true)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                title="Manage Tags"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Manage Tags
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                + New Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-neutral-800/50 flex items-center justify-center">
              <svg className="w-12 h-12 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No plans yet</h3>
            <p className="text-neutral-400 mb-6">Create your first training plan to get started</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              Create Your First Plan
            </button>
          </div>
        ) : (
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg overflow-hidden">
            {/* List Header */}
            <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <div className="col-span-5">Plan Name</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-neutral-800">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="block px-6 py-4 hover:bg-neutral-800/30 transition-colors group"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {plan.name}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-neutral-400">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-3 text-sm text-neutral-500 truncate">
                      {plan.description || '—'}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400/80 hover:text-red-300 transition-colors"
                        title="Delete plan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Plan Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Create New Plan</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm text-gray-400 mb-2">
                Plan Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
                placeholder="e.g., Summer Training 2025"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Manager */}
      {managerOpen && (
        <PlanTagsManager
          onClose={() => setManagerOpen(false)}
          onUpdate={() => fetchPlans()}
        />
      )}
    </div>
  );
}
