'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableDayCellProps {
  weekNumber: number;
  dayNumber: number;
  dayName: string;
  children: React.ReactNode;
  onCreateWorkout?: () => void;
  onCopyWorkout?: () => void;
  onAddRoutine?: () => void;
  date?: string; // Optional date string for athlete calendar
}

export function DroppableDayCell({
  weekNumber,
  dayNumber,
  dayName,
  children,
  onCreateWorkout,
  onCopyWorkout,
  onAddRoutine,
  date
}: DroppableDayCellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: date ? `day-${date}` : `day-${weekNumber}-${dayNumber}`,
    data: date ? { date } : undefined,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-neutral-900/30 border rounded p-2 min-h-[120px] transition-colors snap-start flex-shrink-0 lg:flex-shrink w-[200px] lg:w-auto ${
        isOver ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-800'
      }`}
    >
      {/* Day Header with + Dropdown */}
      <div className="mb-1.5 pb-1 border-b border-neutral-800 flex items-center justify-between">
        <div className="text-[10px] lg:text-[10px] font-semibold text-neutral-500 uppercase">
          {dayName}
        </div>

        {/* Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-0.5 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors"
            title="Add workout or routine"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {showDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg py-1 min-w-[140px]">
                {onCreateWorkout && (
                  <button
                    onClick={() => {
                      onCreateWorkout();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Create Workout
                  </button>
                )}
                {onCopyWorkout && (
                  <button
                    onClick={() => {
                      onCopyWorkout();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    Copy Workout
                  </button>
                )}
                {onAddRoutine && (
                  <button
                    onClick={() => {
                      onAddRoutine();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Add Routine
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
