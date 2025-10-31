'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AthleteDashboardView from '@/components/dashboard/athletes/athlete-dashboard-view';
import AthleteFABNav from '@/components/dashboard/athletes/athlete-fab-nav';

import dynamic from 'next/dynamic';
import ForceOverviewSection from '@/components/dashboard/athletes/force-profile/force-overview-section';

// Lazy load view-specific components
const HittingProfileView = dynamic(() => import('@/components/dashboard/athlete-views/HittingProfileView'), {
  loading: () => <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]"><div className="text-gray-400">Loading...</div></div>
});

const PitchingProfileView = dynamic(() => import('@/components/dashboard/athlete-views/PitchingProfileView'), {
  loading: () => <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]"><div className="text-gray-400">Loading...</div></div>
});

type ActiveSection = 'calendar' | 'force-profile' | 'hitting' | 'pitching';

export default function AthleteDashboardPage() {
  const router = useRouter();
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [viewTypeId, setViewTypeId] = useState<string | null>(null);
  const [viewTypeName, setViewTypeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    // Load last viewed section from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('athlete-dashboard-section');
      return (saved as ActiveSection) || 'calendar';
    }
    return 'calendar';
  });
  const [jumpToToday, setJumpToToday] = useState(0); // Trigger to tell calendar to jump to today
  const [hasTodayWorkouts, setHasTodayWorkouts] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0); // For force profile carousel
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px) to trigger slide change
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (maxSlides: number) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && carouselIndex < maxSlides - 1) {
      setCarouselIndex(prev => prev + 1);
    }
    if (isRightSwipe && carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    }
  };

  // Save active section to localStorage when it changes
  useEffect(() => {
    if (activeSection) {
      localStorage.setItem('athlete-dashboard-section', activeSection);
      // Reset carousel index when changing sections
      setCarouselIndex(0);
    }
  }, [activeSection]);

  // Check if there are workouts today
  useEffect(() => {
    async function checkTodayWorkouts() {
      if (!athleteId) return;

      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('workout_instances')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('scheduled_date', today)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasTodayWorkouts(true);
      } else {
        setHasTodayWorkouts(false);
      }
    }

    checkTodayWorkouts();
  }, [athleteId]);

  useEffect(() => {
    async function loadAthlete() {
      try {
        const supabase = createClient();

        // Get current user and load their athlete profile
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

        setAthleteId(athlete.id);
        setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
        setViewTypeId(athlete.view_type_id);

        // Extract view type name if available
        if (athlete.athlete_view_types) {
          const viewType = athlete.athlete_view_types as any;
          setViewTypeName(viewType.name);
        }
      } catch (err) {
        console.error('Error loading athlete:', err);
        router.push('/athlete-login');
      } finally {
        setLoading(false);
      }
    }

    loadAthlete();
  }, [router]);

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

  // Determine navigation items based on view type
  const getNavItems = () => {
    const baseItems = [
      {
        id: 'home',
        label: 'Home',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
        onClick: () => setActiveSection('calendar'),
        active: activeSection === 'calendar'
      },
      {
        id: 'today',
        label: 'Today',
        icon: (
          <div className="relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <circle cx="12" cy="13" r="2" fill="currentColor" />
            </svg>
            {hasTodayWorkouts && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            )}
          </div>
        ),
        onClick: () => {
          setActiveSection('calendar');
          // Increment to trigger calendar to jump to today
          setJumpToToday(prev => prev + 1);
        },
        active: false,
        hasWorkouts: hasTodayWorkouts
      },
      {
        id: 'force-profile',
        label: 'Force Profile',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        onClick: () => setActiveSection('force-profile'),
        active: activeSection === 'force-profile'
      }
    ];

    // Add hitting tab for Two Way Performance and Hitting Performance
    if (viewTypeName === 'Two Way Performance' || viewTypeName === 'Hitting Performance') {
      baseItems.push({
        id: 'hitting',
        label: 'Hitting',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        ),
        onClick: () => setActiveSection('hitting'),
        active: activeSection === 'hitting'
      });
    }

    // Add pitching tab for Two Way Performance and Pitching Performance
    if (viewTypeName === 'Two Way Performance' || viewTypeName === 'Pitching Performance') {
      baseItems.push({
        id: 'pitching',
        label: 'Pitching',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        onClick: () => setActiveSection('pitching'),
        active: activeSection === 'pitching'
      });
    }

    return baseItems;
  };

  // Handler for navigating to specific tests from force profile
  const handleNavigateToTest = (testType: 'cmj' | 'sj' | 'hj' | 'ppu' | 'imtp') => {
    router.push(`/athlete-dashboard/tests/${testType}`);
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'calendar':
        return <AthleteDashboardView athleteId={athleteId} fullName={athleteName} jumpToToday={jumpToToday} viewTypeName={viewTypeName} />;

      case 'force-profile':
        return (
          <div className="min-h-screen bg-[#0A0A0A]">
            <div className="bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-transparent p-4 pb-8">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-1">Force Profile</h1>
                <p className="text-gray-400 text-sm">{athleteName}</p>
              </div>
            </div>
            <div className="px-4 pb-8">
              <ForceOverviewSection
                athleteId={athleteId}
                isFullscreen={false}
                onNavigateToTest={handleNavigateToTest}
              />
            </div>
          </div>
        );

      case 'hitting':
        return <HittingProfileView athleteId={athleteId} athleteName={athleteName} />;

      case 'pitching':
        return <PitchingProfileView athleteId={athleteId} athleteName={athleteName} />;

      default:
        return <AthleteDashboardView athleteId={athleteId} fullName={athleteName} viewTypeName={viewTypeName} />;
    }
  };

  return (
    <div className="relative">
      {/* Content with bottom padding for FAB */}
      <div className="pb-24">
        {renderContent()}
      </div>

      {/* FAB Navigation - dynamically shows relevant tabs */}
      <AthleteFABNav items={getNavItems()} athleteId={athleteId} />
    </div>
  );
}
