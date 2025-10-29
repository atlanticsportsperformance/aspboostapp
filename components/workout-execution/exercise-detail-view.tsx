'use client';

import { useState } from 'react';

interface ExerciseDetailViewProps {
  exercise: any;
  exerciseInputs: Array<any>;
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

  const handleCompleteAndNext = () => {
    if (hasNext) {
      onNext();
    } else {
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-900 to-black border-b border-white/10 px-4 py-4">
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

        {/* Exercise Title & Progress */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-1">{exerciseData?.name || 'Exercise'}</h1>
          <p className="text-sm text-gray-400">
            Exercise {currentIndex + 1} of {totalExercises} • {completedSets}/{targetSets} sets complete
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] transition-all duration-500"
            style={{ width: `${(completedSets / targetSets) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise Notes */}
      {exercise.notes && (
        <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-300 mb-0.5">Exercise Notes</p>
              <p className="text-sm text-gray-300">{exercise.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Set Input Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="max-w-2xl mx-auto space-y-2">
          {Array.from({ length: targetSets }, (_, idx) => {
            const input = exerciseInputs[idx] || {};
            const isCompleted = input.reps > 0 || input.weight > 0;
            const hasNotes = input.notes && input.notes.trim().length > 0;

            return (
              <div
                key={idx}
                className={`bg-white/5 border rounded-lg p-2 transition-all ${
                  isCompleted
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
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
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* LEFT COLUMN: Primary Metrics (Reps) - BLACK with WHITE OUTLINE */}
                      <div className="space-y-1">
                        {primaryMetrics.map(([key, targetValue]: [string, any]) => {
                          const isTrackedPR = exercise.tracked_max_metrics?.includes(key);
                          const formattedKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <div key={key}>
                              <label className="block text-[9px] text-gray-400 mb-0.5 font-semibold flex items-center gap-0.5 truncate">
                                {formattedKey}
                                {isTrackedPR && <span className="text-yellow-400 text-[10px]">🏆</span>}
                              </label>
                              <input
                                type="number"
                                step="1"
                                value={input[key] || ''}
                                onChange={(e) => onInputChange(idx, key, parseFloat(e.target.value) || 0)}
                                placeholder={targetValue || '0'}
                                className={`w-full bg-black border rounded px-1.5 py-1 text-white text-sm font-bold text-center focus:outline-none focus:ring-1 transition-all ${
                                  isTrackedPR
                                    ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500/30'
                                    : 'border-white/30 focus:border-white/50 focus:ring-white/20'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* RIGHT COLUMN: Secondary Metrics (Weight, Time, Distance, Velo) - GRAY */}
                      <div className="space-y-1">
                        {secondaryMetrics.map(([key, targetValue]: [string, any]) => {
                          const isTrackedPR = exercise.tracked_max_metrics?.includes(key);
                          const formattedKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <div key={key}>
                              <label className="block text-[9px] text-gray-400 mb-0.5 font-semibold flex items-center gap-0.5 truncate">
                                {formattedKey}
                                {isTrackedPR && <span className="text-yellow-400 text-[10px]">🏆</span>}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={input[key] || ''}
                                onChange={(e) => onInputChange(idx, key, parseFloat(e.target.value) || 0)}
                                placeholder={targetValue || '0'}
                                className={`w-full bg-gray-800 border rounded px-1.5 py-1 text-white text-sm font-bold text-center focus:outline-none focus:ring-1 transition-all ${
                                  isTrackedPR
                                    ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500/30'
                                    : 'border-gray-600 focus:border-gray-500 focus:ring-gray-500/30'
                                }`}
                              />
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

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 bg-gradient-to-t from-gray-900 to-black border-t border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Navigation Arrows */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                hasPrev
                  ? 'text-white bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'text-gray-600 bg-white/5 border border-white/5 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                hasNext
                  ? 'text-white bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'text-gray-600 bg-white/5 border border-white/5 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Complete & Next Button */}
          <button
            onClick={handleCompleteAndNext}
            className="w-full bg-gradient-to-r from-[#9BDDFF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#9BDDFF] text-black font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9BDDFF]/20"
          >
            {hasNext ? 'Complete & Next Exercise' : 'Complete & Return to Overview'}
          </button>
        </div>
      </div>
    </div>
  );
}
