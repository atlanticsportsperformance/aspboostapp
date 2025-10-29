'use client';

import { useState } from 'react';
import { ExerciseHistoryPanel } from './exercise-history-panel';

interface ExerciseDetailViewProps {
  exercise: any;
  exerciseInputs: Array<any>;
  completedSetsTracker: boolean[];
  currentSetIndex: number;
  onSetComplete: (setIndex: number) => void;
  onSetIncomplete: (setIndex: number) => void;
  onSetIndexChange: (index: number) => void;
  onInputChange: (setIndex: number, field: string, value: any) => void;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalExercises: number;
  timer: number;
  athleteId: string;
}

export default function ExerciseDetailView({
  exercise,
  exerciseInputs,
  completedSetsTracker,
  currentSetIndex,
  onSetComplete,
  onSetIncomplete,
  onSetIndexChange,
  onInputChange,
  onBack,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  totalExercises,
  timer,
  athleteId
}: ExerciseDetailViewProps) {
  const exerciseData = exercise.exercises;
  const targetSets = exercise.sets || 3;
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Get all metric targets from the new system
  const metricTargets = exercise.metric_targets || {};
  const hasMetrics = Object.keys(metricTargets).length > 0;

  // Calculate completion
  const completedSets = exerciseInputs.filter((input: any) =>
    input && (input.reps > 0 || input.weight > 0)
  ).length;

  // Get custom metrics for this exercise
  const customMetrics = exercise.custom_metrics || [];

  // Format timer display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextSet = () => {
    // Check if current set has any data
    const currentSetData = exerciseInputs[currentSetIndex] || {};
    const hasAnyData = Object.keys(metricTargets).some(key => {
      const val = currentSetData[key];
      return val && val !== '' && val !== 0;
    });

    // If no data entered, save the placeholder/target values as the actual values
    if (!hasAnyData) {
      // Save all target values as the actual values (auto-fill from placeholders)
      Object.entries(metricTargets).forEach(([key, targetValue]) => {
        // Only save if there's a target value and no current value
        if (targetValue && !currentSetData[key]) {
          onInputChange(currentSetIndex, key, targetValue);
        }
      });
    }

    // Mark current set as completed
    onSetComplete(currentSetIndex);

    // Move to next set or next exercise
    if (currentSetIndex < targetSets - 1) {
      // Move to next set
      onSetIndexChange(currentSetIndex + 1);
    } else {
      // All sets completed, move to next exercise or back to overview
      if (hasNext) {
        onNext();
      } else {
        onBack();
      }
    }
  };

  const handlePreviousSet = () => {
    if (currentSetIndex > 0) {
      // Go back to previous set and uncheck it
      onSetIncomplete(currentSetIndex - 1);
      onSetIndexChange(currentSetIndex - 1);
    } else {
      // At first set, go to previous exercise
      if (hasPrev) {
        onPrev();
      }
    }
  };

  const dismissKeyboard = () => {
    setFocusedInput(null);
    // Blur any active input
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-900 to-black border-b border-white/10 px-4 py-3">
        {/* Top Row - Back & Timer */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Overview</span>
          </button>

          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold">{formatTime(timer)}</span>
          </div>
        </div>

        {/* Exercise Title - Left Aligned */}
        <div className="text-left">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">{exerciseData?.name || 'Exercise'}</h1>
          {/* Exercise Notes - Inline */}
          {exercise.notes && (
            <p className="text-xs text-gray-400 mt-1">{exercise.notes}</p>
          )}
        </div>
      </div>

      {/* Video Section */}
      {exerciseData?.video_url && (() => {
        // Convert YouTube URL to embed format and add mute parameter
        let videoUrl = exerciseData.video_url;

        // Handle youtube.com/watch?v=VIDEO_ID
        if (videoUrl.includes('youtube.com/watch')) {
          const videoId = new URL(videoUrl).searchParams.get('v');
          if (videoId) {
            videoUrl = `https://www.youtube.com/embed/${videoId}?mute=1&autoplay=0`;
          }
        }
        // Handle youtu.be/VIDEO_ID
        else if (videoUrl.includes('youtu.be/')) {
          const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
          videoUrl = `https://www.youtube.com/embed/${videoId}?mute=1&autoplay=0`;
        }
        // Handle youtube.com/embed/VIDEO_ID (already embed format)
        else if (videoUrl.includes('youtube.com/embed/')) {
          const separator = videoUrl.includes('?') ? '&' : '?';
          videoUrl = `${videoUrl}${separator}mute=1&autoplay=0`;
        }

        return (
          <div className="flex-shrink-0 bg-black">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={videoUrl}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            </div>
          </div>
        );
      })()}

      {/* Exercise History Panel */}
      <div className="px-2 py-2 flex-shrink-0">
        <ExerciseHistoryPanel
          athleteId={athleteId}
          exerciseId={exercise.exercise_id}
          exerciseName={exerciseData?.name || 'Exercise'}
        />
      </div>

      {/* Set Input Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="max-w-2xl mx-auto space-y-2">
          {Array.from({ length: targetSets }, (_, idx) => {
            const input = exerciseInputs[idx] || {};
            const isCompleted = completedSetsTracker[idx];
            const hasNotes = input.notes && input.notes.trim().length > 0;

            return (
              <div
                key={idx}
                className="p-2 transition-all"
              >
                {/* Set Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                    )}
                    <span className="text-sm font-bold text-white">Set {idx + 1}</span>
                  </div>
                  {isCompleted && (
                    <span className="text-xs text-green-400 font-medium">Complete</span>
                  )}
                </div>

                {/* All Metrics from metric_targets - 2 Column Layout */}
                {hasMetrics && (() => {
                  // Separate primary and secondary metrics
                  const primaryMetrics: [string, any][] = [];
                  const secondaryMetrics: [string, any][] = [];

                  Object.entries(metricTargets).forEach(([key, value]) => {
                    if (!key) return;
                    const isPrimary = key === 'reps' || key.toLowerCase().endsWith('_reps');
                    if (isPrimary) {
                      primaryMetrics.push([key, value]);
                    } else {
                      secondaryMetrics.push([key, value]);
                    }
                  });

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {/* LEFT COLUMN: Primary Metrics (Reps) - BLACK with WHITE OUTLINE */}
                      <div className="space-y-1 flex flex-col items-end">
                        {primaryMetrics.map(([key, targetValue]: [string, any]) => {
                          const isTrackedPR = exercise.tracked_max_metrics?.includes(key);
                          const formattedKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <div key={key} className="flex flex-col items-end">
                              <div className="w-[120px] flex flex-col items-center">
                                <label className="text-[9px] text-gray-400 mb-0.5 font-semibold flex items-center gap-0.5">
                                  {formattedKey}
                                  {isTrackedPR && <span className="text-yellow-400 text-[10px]">🏆</span>}
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="1"
                                  value={input[key] || ''}
                                  onChange={(e) => onInputChange(idx, key, parseFloat(e.target.value) || 0)}
                                  onFocus={() => setFocusedInput(`${idx}-${key}`)}
                                  onBlur={() => setFocusedInput(null)}
                                  placeholder={targetValue || '0'}
                                  className={`w-full bg-black border-0 rounded px-2 py-1.5 text-white text-sm font-bold text-center focus:outline-none transition-all ${
                                    isTrackedPR ? 'text-yellow-300' : ''
                                  }`}
                                  style={{ fontSize: '16px' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* RIGHT COLUMN: Secondary Metrics (Weight, Time, Distance, Velo) - GRAY */}
                      <div className="space-y-1 flex flex-col items-start">
                        {secondaryMetrics.map(([key, targetValue]: [string, any]) => {
                          const isTrackedPR = exercise.tracked_max_metrics?.includes(key);
                          const formattedKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <div key={key} className="flex flex-col items-start">
                              <div className="w-[120px] flex flex-col items-center">
                                <label className="text-[9px] text-gray-400 mb-0.5 font-semibold flex items-center gap-0.5">
                                  {formattedKey}
                                  {isTrackedPR && <span className="text-yellow-400 text-[10px]">🏆</span>}
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={input[key] || ''}
                                  onChange={(e) => onInputChange(idx, key, parseFloat(e.target.value) || 0)}
                                  onFocus={() => setFocusedInput(`${idx}-${key}`)}
                                  onBlur={() => setFocusedInput(null)}
                                  placeholder={targetValue || '0'}
                                  className={`w-full bg-neutral-700 border-0 rounded px-2 py-1.5 text-white text-sm font-bold text-center focus:outline-none transition-all ${
                                    isTrackedPR ? 'text-yellow-300' : ''
                                  }`}
                                  style={{ fontSize: '16px' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Show message if no metrics configured */}
                {!hasMetrics && (
                  <div className="text-center py-4 text-yellow-300 text-sm">
                    No metrics configured for this exercise
                  </div>
                )}

                {/* Notes Field - Only show if has content */}
                {hasNotes && (
                  <div className="pt-3 border-t border-white/10 mt-3">
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Notes</label>
                    <input
                      type="text"
                      value={input.notes || ''}
                      onChange={(e) => onInputChange(idx, 'notes', e.target.value)}
                      placeholder="Add notes..."
                      className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9BDDFF] focus:ring-2 focus:ring-[#9BDDFF]/20 transition-all"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercise Navigation Buttons - Bottom Center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40">
        {/* Previous Exercise */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-white/20 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev Exercise
          </button>
        )}

        {/* Exercise Counter */}
        <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium">
          {currentIndex + 1} of {totalExercises}
        </div>

        {/* Next Exercise */}
        {hasNext && (
          <button
            onClick={onNext}
            className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-white/20 transition-all active:scale-95"
          >
            Next Exercise
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col items-center gap-1 z-50">
        {/* Label */}
        <span className="text-xs text-white/60 font-medium uppercase tracking-wide">Sets</span>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Back/Previous Set FAB */}
          {(currentSetIndex > 0 || hasPrev) && (
            <button
              onClick={handlePreviousSet}
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-white/20 transition-all active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next Set / Next Exercise / Complete FAB */}
          <button
            onClick={handleNextSet}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] text-black flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            {currentSetIndex < targetSets - 1 ? (
              // More sets to complete - show right arrow
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : hasNext ? (
              // All sets complete, has next exercise - show right arrow
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              // All sets complete, no next exercise - show checkmark
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
