'use client';

import { useRouter } from 'next/navigation';
import { clearWorkoutState } from '@/lib/workout-persistence';

interface ResumeWorkoutModalProps {
  workoutInstanceId: string;
  athleteId: string;
  workoutName: string;
  startedAt: string;
  onClose: () => void;
}

export default function ResumeWorkoutModal({
  workoutInstanceId,
  athleteId,
  workoutName,
  startedAt,
  onClose
}: ResumeWorkoutModalProps) {
  const router = useRouter();

  const timeSinceStart = (() => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  })();

  const handleResume = () => {
    // Navigate to workout execution page - state will auto-load from localStorage
    router.push(`/dashboard/athletes/${athleteId}/workouts/${workoutInstanceId}/execute`);
    onClose();
  };

  const handleRestart = () => {
    // Clear saved state and navigate to fresh workout
    clearWorkoutState();
    router.push(`/dashboard/athletes/${athleteId}/workouts/${workoutInstanceId}/execute`);
    onClose();
  };

  const handleDiscard = () => {
    // Just clear the saved state
    clearWorkoutState();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#9BDDFF]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Workout In Progress
          </h2>

          {/* Description */}
          <div className="text-center mb-6">
            <p className="text-white/80 font-medium mb-1">{workoutName}</p>
            <p className="text-sm text-gray-400">Started {timeSinceStart}</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">Your progress is saved</p>
                <p className="text-xs text-gray-400">Resume right where you left off or start fresh</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Resume Button - Primary */}
            <button
              onClick={handleResume}
              className="w-full bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black font-bold py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9BDDFF]/20"
            >
              Resume Workout
            </button>

            {/* Restart Button - Secondary */}
            <button
              onClick={handleRestart}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10"
            >
              Restart from Beginning
            </button>

            {/* Discard Button - Tertiary */}
            <button
              onClick={handleDiscard}
              className="w-full text-gray-400 hover:text-white font-medium py-2 px-4 rounded-xl transition-all text-sm"
            >
              Discard Progress
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
