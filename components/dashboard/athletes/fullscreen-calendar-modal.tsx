'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDraggable } from '@dnd-kit/core';

interface FullscreenCalendarModalProps {
  athleteId: string;
  onClose: () => void;
  calendarComponent: React.ReactNode;
}

// Draggable Recommendation Item Component
function DraggableRecommendation({ item, type, children }: { item: any; type: 'plan' | 'workout'; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recommendation-${type}-${item.id}`,
    data: {
      type: 'recommendation',
      recommendationType: type,
      item: item,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

export function FullscreenCalendarModal({ athleteId, onClose, calendarComponent }: FullscreenCalendarModalProps) {
  const [recommendedPlans, setRecommendedPlans] = useState<any[]>([]);
  const [recommendedWorkouts, setRecommendedWorkouts] = useState<any[]>([]);
  const [recommendedRoutines, setRecommendedRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [athleteId]);

  async function fetchRecommendations() {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch athlete's tags
      const { data: athleteTags } = await supabase
        .from('athlete_tags')
        .select('tag_name, tag_type')
        .eq('athlete_id', athleteId);

      if (!athleteTags || athleteTags.length === 0) {
        setLoading(false);
        return;
      }

      const planTagNames = athleteTags
        .filter(t => t.tag_type === 'plan')
        .map(t => t.tag_name);

      const workoutTagNames = athleteTags
        .filter(t => t.tag_type === 'workout')
        .map(t => t.tag_name);

      const exerciseTagNames = athleteTags
        .filter(t => t.tag_type === 'exercise')
        .map(t => t.tag_name);

      // Fetch recommended plans
      if (planTagNames.length > 0) {
        const { data: plans } = await supabase
          .from('training_plans')
          .select('*')
          .contains('tags', planTagNames)
          .limit(10);

        setRecommendedPlans(plans || []);
      }

      // Fetch recommended workouts
      if (workoutTagNames.length > 0) {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('*')
          .contains('tags', workoutTagNames)
          .eq('is_template', true)
          .limit(10);

        setRecommendedWorkouts(workouts || []);
      }

      // Fetch recommended routines (if needed)
      // TODO: Add routine recommendations based on exercise tags

    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-white/10 p-3 md:p-4 flex items-center justify-between">
        <h2 className="text-lg md:text-2xl font-bold text-white">
          <span className="hidden md:inline">Calendar & Recommendations</span>
          <span className="md:hidden">Calendar</span>
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
          title="Exit fullscreen"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content: Sidebar + Calendar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Recommendations - Hidden on mobile */}
        <div className="hidden md:block md:w-72 lg:w-80 bg-[#0A0A0A] border-r border-white/10 overflow-y-auto p-4">
          <h3 className="text-base lg:text-lg font-bold text-white mb-4">Recommended Content</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-4 text-sm">Loading recommendations...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommended Plans */}
              {recommendedPlans.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#9BDDFF] mb-3">PLANS</h4>
                  <div className="space-y-2">
                    {recommendedPlans.map((plan) => (
                      <DraggableRecommendation key={plan.id} item={plan} type="plan">
                        <div className="bg-[#9BDDFF]/10 border border-[#9BDDFF]/30 rounded-lg p-3 hover:opacity-80 transition-all cursor-grab active:cursor-grabbing">
                          <p className="text-white font-medium text-sm">{plan.name}</p>
                          {plan.description && (
                            <p className="text-[#9BDDFF] text-xs mt-1 line-clamp-2">{plan.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {plan.tags?.map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 bg-white/10 text-white text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </DraggableRecommendation>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Workouts */}
              {recommendedWorkouts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#9BDDFF] mb-3">WORKOUTS</h4>
                  <div className="space-y-2">
                    {recommendedWorkouts.map((workout) => {
                      // Color code by category - matches existing app color scheme
                      const getCategoryColor = (category: string | null) => {
                        if (!category) return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-gray-400' };
                        const cat = category.toLowerCase();
                        // Match colors from plan builder: hitting=red, throwing=blue, strength=green
                        if (cat.includes('hitting')) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
                        if (cat.includes('throwing') || cat.includes('pitching')) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
                        if (cat.includes('strength') || cat.includes('conditioning')) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' };
                        return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-gray-400' };
                      };

                      const colors = getCategoryColor(workout.category);

                      return (
                        <DraggableRecommendation key={workout.id} item={workout} type="workout">
                          <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 hover:opacity-80 transition-all cursor-grab active:cursor-grabbing`}>
                            <p className="text-white font-medium text-sm">{workout.name}</p>
                            {workout.category && (
                              <p className={`${colors.text} text-xs mt-1 capitalize font-medium`}>
                                {workout.category.replace(/_/g, ' ')}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {workout.tags?.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 bg-white/10 text-white text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </DraggableRecommendation>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {recommendedPlans.length === 0 && recommendedWorkouts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No recommendations yet</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Add tags to this athlete to see personalized recommendations
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Calendar */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950">
          {calendarComponent}
        </div>
      </div>
    </div>
  );
}
