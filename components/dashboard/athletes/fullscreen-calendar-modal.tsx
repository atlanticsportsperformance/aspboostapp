'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FullscreenCalendarModalProps {
  athleteId: string;
  onClose: () => void;
}

export function FullscreenCalendarModal({ athleteId, onClose }: FullscreenCalendarModalProps) {
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
      <div className="bg-[#0A0A0A] border-b border-white/10 p-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Calendar & Recommendations</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Exit fullscreen"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content: Sidebar + Calendar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Recommendations */}
        <div className="w-80 bg-[#0A0A0A] border-r border-white/10 overflow-y-auto p-4">
          <h3 className="text-lg font-bold text-white mb-4">Recommended Content</h3>

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
                  <h4 className="text-sm font-semibold text-[#C9A857] mb-3">PLANS</h4>
                  <div className="space-y-2">
                    {recommendedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all cursor-grab"
                        draggable
                      >
                        <p className="text-white font-medium text-sm">{plan.name}</p>
                        {plan.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{plan.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.tags?.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-[#C9A857]/20 text-[#C9A857] text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Workouts */}
              {recommendedWorkouts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#C9A857] mb-3">WORKOUTS</h4>
                  <div className="space-y-2">
                    {recommendedWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all cursor-grab"
                        draggable
                      >
                        <p className="text-white font-medium text-sm">{workout.name}</p>
                        {workout.category && (
                          <p className="text-gray-400 text-xs mt-1 capitalize">{workout.category}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workout.tags?.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
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
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-white text-xl font-semibold mb-2">Calendar Integration Coming Soon</h3>
              <p className="text-gray-400 text-sm max-w-md">
                The full calendar will be integrated here. For now, you can see your recommended content on the left and close this to use the regular calendar view.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-[#C9A857] hover:bg-[#B89847] text-black font-semibold rounded-lg transition-colors"
              >
                Back to Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
