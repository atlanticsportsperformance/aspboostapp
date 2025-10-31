'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AthleteDashboardView from '@/components/dashboard/athletes/athlete-dashboard-view';
import DefaultAthleteView from '@/components/dashboard/athlete-views/DefaultAthleteView';

export default function AthleteDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [viewTypeId, setViewTypeId] = useState<string | null>(null);
  const [viewTypeName, setViewTypeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    async function loadAthlete() {
      try {
        const supabase = createClient();

        // Check if we're in preview mode (super admin viewing as athlete)
        const previewAthleteId = searchParams?.get('athleteId');
        const isPreview = searchParams?.get('preview') === 'true';

        if (isPreview && previewAthleteId) {
          // Preview mode: Load the specified athlete's data
          setIsPreviewMode(true);

          const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select(`
              id,
              first_name,
              last_name,
              view_type_id,
              athlete_view_types (
                id,
                name,
                description
              )
            `)
            .eq('id', previewAthleteId)
            .single();

          if (athleteError || !athlete) {
            console.error('Failed to load athlete for preview:', athleteError);
            router.push('/dashboard/player-preview');
            return;
          }

          setAthleteId(athlete.id);
          setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
          setViewTypeId(athlete.view_type_id);

          if (athlete.athlete_view_types) {
            const viewType = athlete.athlete_view_types as any;
            setViewTypeName(viewType.name);
          }
        } else {
          // Normal mode: Get current user and load their athlete profile
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            router.push('/athlete-login');
            return;
          }

          // Get athlete profile with view_type_id
          const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select(`
              id,
              first_name,
              last_name,
              view_type_id,
              athlete_view_types (
                id,
                name,
                description
              )
            `)
            .eq('user_id', user.id)
            .single();

          if (athleteError || !athlete) {
            console.error('Failed to load athlete profile:', athleteError);
            router.push('/athlete-login');
            return;
          }

          console.log('Loaded athlete with view type:', athlete);

          setAthleteId(athlete.id);
          setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
          setViewTypeId(athlete.view_type_id);

          // Extract view type name if available
          if (athlete.athlete_view_types) {
            const viewType = athlete.athlete_view_types as any;
            setViewTypeName(viewType.name);
          }
        }
      } catch (err) {
        console.error('Error loading athlete:', err);
        if (!isPreviewMode) {
          router.push('/athlete-login');
        }
      } finally {
        setLoading(false);
      }
    }

    loadAthlete();
  }, [router, searchParams, isPreviewMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!athleteId) {
    return null;
  }

  // Route to different dashboard views based on view_type_id
  // For now, use the existing AthleteDashboardView as default
  // Later, we'll add view-specific components

  console.log('Rendering dashboard for view type:', viewTypeName || 'Default');

  // TODO: Add routing logic for specific view types
  // Example:
  // if (viewTypeName === 'Two Way Performance') {
  //   return <TwoWayPerformanceView athleteId={athleteId} fullName={athleteName} />;
  // }

  // Default view (current implementation)
  return (
    <div>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="sticky top-0 z-50 bg-[#9BDDFF] text-black px-4 py-2 text-center font-medium text-sm">
          Preview Mode: Viewing as {athleteName}
          <button
            onClick={() => router.push('/dashboard/player-preview')}
            className="ml-4 px-3 py-1 bg-black/10 rounded hover:bg-black/20 transition-colors"
          >
            Back to Selection
          </button>
        </div>
      )}

      {/* Show view type badge if set */}
      {viewTypeName && (
        <div className="bg-black border-b border-white/10 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {viewTypeName} View
            </span>
          </div>
        </div>
      )}
      <AthleteDashboardView athleteId={athleteId} fullName={athleteName} />
    </div>
  );
}
