'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PlanTagsManager } from '@/components/dashboard/plans/plan-tags-manager';
import { useStaffPermissions } from '@/lib/auth/use-staff-permissions';
import { getContentFilter } from '@/lib/auth/permissions';

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function PlansPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);

  // Permissions state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'coach' | 'athlete'>('coach');
  const { permissions } = useStaffPermissions(userId);
  const [planPermissions, setPlanPermissions] = useState<{[key: string]: {canEdit: boolean, canDelete: boolean}}>({});

  // Load user info and permissions
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.app_role || 'coach');
        }
      }
    }
    loadUser();
  }, []);

  // Fetch plans when user info changes
  useEffect(() => {
    if (userId !== null) {
      fetchPlans();
    }
  }, [pathname, userId, userRole]);

  // Recompute permissions when permissions load or plans change
  useEffect(() => {
    if (plans.length > 0 && userId && permissions) {
      computePlanPermissions();
    }
  }, [plans.length, userId, userRole, JSON.stringify(permissions)]);

  async function fetchPlans() {
    if (!userId) return;
    setLoading(true);

    // Apply visibility filter
    const filter = await getContentFilter(userId, userRole, 'plans');

    let query = supabase
      .from('training_plans')
      .select(`
        *,
        creator:created_by (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply creator filter based on permissions
    if (filter.filter === 'ids' && filter.creatorIds) {
      if (filter.creatorIds.length === 0) {
        setPlans([]);
        setLoading(false);
        return;
      }
      query = query.in('created_by', filter.creatorIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }

  async function computePlanPermissions() {
    if (!userId || !plans || plans.length === 0) return;

    const permsMap: {[key: string]: {canEdit: boolean, canDelete: boolean}} = {};
    const creatorIds = [...new Set(plans.map(p => p.created_by).filter(Boolean))] as string[];

    if (creatorIds.length > 0) {
      // Batch fetch all creator roles at once
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, app_role')
        .in('id', creatorIds);

      const creatorRoles = new Map(creators?.map(c => [c.id, c.app_role]) || []);

      for (const plan of plans) {
        const isOwnPlan = plan.created_by === userId;
        const creatorRole = plan.created_by ? creatorRoles.get(plan.created_by) : null;
        const isAdminOrSuperAdminPlan = creatorRole === 'admin' || creatorRole === 'super_admin';

        const canEdit = userRole === 'super_admin' ||
                        (isOwnPlan && permissions?.can_edit_own_plans) ||
                        (isAdminOrSuperAdminPlan && permissions?.can_edit_admin_plans);
        const canDelete = userRole === 'super_admin' ||
                          (isOwnPlan && permissions?.can_delete_own_plans) ||
                          (isAdminOrSuperAdminPlan && permissions?.can_delete_admin_plans);

        permsMap[plan.id] = { canEdit, canDelete };
      }
    }

    setPlanPermissions(permsMap);
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
        created_by: user.id,
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
      <div className="p-3 lg:p-6">
        <div className="text-gray-400 text-sm">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Compact Mobile Header */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="p-3 lg:p-6">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-white">Training Plans</h1>
              <p className="text-gray-400 text-xs lg:text-sm mt-0.5 lg:mt-1 hidden sm:block">
                Create and manage your training programs
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setManagerOpen(true)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                title="Manage Tags"
              >
                ⚙️
              </button>
              {(userRole === 'super_admin' || permissions?.can_create_plans) && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-3 py-2 lg:px-4 lg:py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg font-medium transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">+ Create</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="p-3 lg:p-6">
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">No plans yet</p>
            {(userRole === 'super_admin' || permissions?.can_create_plans) && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-2 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg font-medium transition-colors text-sm"
              >
                Create Your First Plan
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-2">
              {plans.map((plan) => {
                const canEdit = planPermissions[plan.id]?.canEdit;
                const canDelete = planPermissions[plan.id]?.canDelete;

                return (
                  <div
                    key={plan.id}
                    onClick={() => canEdit && router.push(`/dashboard/plans/${plan.id}`)}
                    className={`bg-white/5 border border-white/10 rounded-lg p-3 ${canEdit ? 'active:bg-white/10' : ''}`}
                  >
                    {/* Top Row: Name */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm truncate">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{plan.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Created Date */}
                    <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
                      <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Bottom Row: Creator and Actions */}
                    <div className="flex items-center justify-between gap-2">
                      {plan.creator ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                            {plan.creator.first_name?.[0]}{plan.creator.last_name?.[0]}
                          </div>
                          <span className="text-xs text-gray-400 truncate">
                            {plan.creator.first_name} {plan.creator.last_name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">—</div>
                      )}

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/plans/${plan.id}`);
                            }}
                            className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id);
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-neutral-900/30 border border-neutral-800 rounded-lg overflow-hidden">
              {/* List Header */}
              <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <div className="col-span-4">Plan Name</div>
                  <div className="col-span-2">Created By</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
              </div>

              {/* List Items */}
              <div className="divide-y divide-neutral-800">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="block px-6 py-4 hover:bg-neutral-800/30 transition-colors group"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="text-white font-medium">
                          {plan.name}
                        </div>
                      </div>
                      <div className="col-span-2">
                        {plan.creator ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#9BDDFF]/20 flex items-center justify-center text-[#9BDDFF] text-xs font-semibold">
                              {plan.creator.first_name?.[0]}{plan.creator.last_name?.[0]}
                            </div>
                            <div className="text-sm text-neutral-300">
                              {plan.creator.first_name} {plan.creator.last_name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-600">—</span>
                        )}
                      </div>
                      <div className="col-span-2 text-sm text-neutral-400">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 text-sm text-neutral-500 truncate">
                        {plan.description || '—'}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {planPermissions[plan.id]?.canEdit && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/dashboard/plans/${plan.id}`);
                            }}
                            className="p-2 hover:bg-blue-500/20 rounded text-blue-400/80 hover:text-blue-300 transition-colors"
                            title="Edit plan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {planPermissions[plan.id]?.canDelete && (
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
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
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
