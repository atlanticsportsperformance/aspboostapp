'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import IndividualTestSection from '@/components/dashboard/athletes/force-profile/individual-test-section';

// Test descriptions for educational purposes
const TEST_DESCRIPTIONS: Record<string, { title: string; description: string; whatItMeasures: string; whyItMatters: string }> = {
  cmj: {
    title: 'Countermovement Jump (CMJ)',
    description: 'A vertical jump test where you start from a standing position, quickly dip down, and explode upward. This is the most commonly used jump test for assessing lower body power.',
    whatItMeasures: 'CMJ measures your ability to use the stretch-shortening cycle (SSC) - the elastic energy stored during the downward phase. Key metrics include jump height, peak power, RSI-modified (reactive strength), and force production.',
    whyItMatters: 'CMJ performance is highly correlated with athletic ability in sports requiring explosive movements like sprinting, changing direction, and jumping. It\'s excellent for tracking neuromuscular fatigue and training adaptations over time.',
  },
  sj: {
    title: 'Squat Jump (SJ)',
    description: 'A vertical jump starting from a static squat position (typically 90° knee angle) without any countermovement. You hold the squat for 2-3 seconds, then explode upward as powerfully as possible.',
    whatItMeasures: 'SJ isolates concentric power production by removing the stretch-shortening cycle. It measures peak power, peak force, and your ability to generate force from a static position. Comparing SJ to CMJ reveals how well you utilize elastic energy.',
    whyItMatters: 'SJ is crucial for sports requiring acceleration from static positions (like linemen in football, track starts). Lower SJ compared to CMJ may indicate poor concentric strength, while similar scores suggest excellent elastic utilization.',
  },
  hj: {
    title: 'Hop Jump (HJ)',
    description: 'A single-leg hopping test where you perform repeated hops on one leg, emphasizing minimal ground contact time and maximal height. This tests fast stretch-shortening cycle capabilities.',
    whatItMeasures: 'HJ primarily measures reactive strength index (RSI) - the ratio of jump height to ground contact time. It assesses your ability to rapidly produce force with minimal ground contact, testing tendon stiffness and neural efficiency.',
    whyItMatters: 'HJ is critical for running speed, agility, and change of direction. High RSI indicates excellent tendon stiffness and reactive strength - key for sprinters, basketball players, and soccer athletes. It\'s also useful for return-to-play assessments after lower limb injuries.',
  },
  ppu: {
    title: 'Prone Pull-Up (PPU)',
    description: 'A horizontal pulling test performed on force plates where you pull your body forward from a prone position. This measures upper body pulling strength and power.',
    whatItMeasures: 'PPU measures peak takeoff force, impulse, and pulling power. It assesses your ability to generate force through horizontal pulling movements, testing lat strength, posterior chain engagement, and core stability.',
    whyItMatters: 'PPU is important for sports requiring pulling movements (rowing, climbing, grappling sports) and for balancing upper body force production. It complements pressing movements and helps identify asymmetries in upper body strength.',
  },
  imtp: {
    title: 'Isometric Mid-Thigh Pull (IMTP)',
    description: 'A maximal isometric test where you pull against an immovable barbell set at mid-thigh height. You pull as hard as possible for 3-5 seconds while force is measured.',
    whatItMeasures: 'IMTP measures net peak force (maximum force produced), relative strength (force per kg body weight), RFD (rate of force development), and time to peak force. It assesses your absolute strength and ability to produce force quickly.',
    whyItMatters: 'IMTP is the gold standard for measuring lower body strength without technical skill confounds. High IMTP correlates with 1RM squat/deadlift, sprint speed, and jump performance. It\'s excellent for tracking strength gains and identifying force production deficits.',
  },
};

export default function IndividualTestPage() {
  const router = useRouter();
  const params = useParams();
  const testTypeParam = params.testType as string;
  const testType = testTypeParam?.toUpperCase() as 'CMJ' | 'SJ' | 'HJ' | 'PPU' | 'IMTP';

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [playLevel, setPlayLevel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAthlete() {
      try {
        const supabase = createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/athlete-login');
          return;
        }

        // Get athlete profile linked to this user
        const { data: athlete, error: athleteError } = await supabase
          .from('athletes')
          .select('id, first_name, last_name, play_level')
          .eq('user_id', user.id)
          .single();

        if (athleteError || !athlete) {
          console.error('Failed to load athlete profile:', athleteError);
          router.push('/athlete-dashboard');
          return;
        }

        setAthleteId(athlete.id);
        setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
        setPlayLevel(athlete.play_level);
      } catch (err) {
        console.error('Error loading athlete:', err);
        router.push('/athlete-dashboard');
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
          <p className="mt-4 text-gray-400">Loading test data...</p>
        </div>
      </div>
    );
  }

  if (!athleteId || !testType || !TEST_DESCRIPTIONS[testTypeParam.toLowerCase()]) {
    return null;
  }

  const testInfo = TEST_DESCRIPTIONS[testTypeParam.toLowerCase()];

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{testInfo.title}</h1>
            <p className="text-sm text-gray-400">{athleteName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Test Data */}
        <IndividualTestSection
          athleteId={athleteId}
          testType={testType}
          playLevel={playLevel}
        />

        {/* Educational Section */}
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">About This Test</h2>

          {/* What Is It */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#9BDDFF] mb-3">What Is It?</h3>
            <p className="text-gray-300 leading-relaxed">{testInfo.description}</p>
          </div>

          {/* What It Measures */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#9BDDFF] mb-3">What It Measures</h3>
            <p className="text-gray-300 leading-relaxed">{testInfo.whatItMeasures}</p>
          </div>

          {/* Why It Matters */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#9BDDFF] mb-3">Why It Matters</h3>
            <p className="text-gray-300 leading-relaxed">{testInfo.whyItMatters}</p>
          </div>

          {/* Percentile Context */}
          <div className="relative bg-black backdrop-blur-xl border border-white/10 rounded-2xl p-6" style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
          }}>
            {/* Glossy shine overlay */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
            }} />
            <h3 className="text-lg font-bold text-white mb-3 relative z-10">Understanding Your Percentile</h3>
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 font-bold text-lg">75+</span>
                </div>
                <div>
                  <div className="text-green-400 font-semibold">ELITE</div>
                  <div className="text-sm text-gray-400">Top 25% of {playLevel} athletes</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#9BDDFF]/20 border border-[#9BDDFF]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#9BDDFF] font-bold text-lg">50+</span>
                </div>
                <div>
                  <div className="text-[#9BDDFF] font-semibold">OPTIMIZE</div>
                  <div className="text-sm text-gray-400">Above average - continue training to reach elite</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-400 font-bold text-lg">25+</span>
                </div>
                <div>
                  <div className="text-yellow-400 font-semibold">SHARPEN</div>
                  <div className="text-sm text-gray-400">Below average - focus area for improvement</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-400 font-bold text-lg">&lt;25</span>
                </div>
                <div>
                  <div className="text-red-400 font-semibold">BUILD</div>
                  <div className="text-sm text-gray-400">Priority area - requires dedicated training</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
