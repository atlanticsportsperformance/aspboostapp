'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Workout {
  id: string;
  name: string;
  category: string | null;
  estimated_duration_minutes: number | null;
}

interface DraggableWorkoutCardProps {
  programDayId: string;
  workout: Workout;
  onClick: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function DraggableWorkoutCard({
  programDayId,
  workout,
  onClick,
  onDelete,
  onDuplicate
}: DraggableWorkoutCardProps) {
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: programDayId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`group relative w-full text-left p-2 rounded transition-all cursor-grab active:cursor-grabbing border-l-4 ${
        workout.category === 'hitting'
          ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500'
          : workout.category === 'throwing'
          ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500'
          : 'bg-green-500/10 hover:bg-green-500/20 border-green-500'
      } ${isDragging ? 'shadow-lg ring-2 ring-white/20' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex-1 min-w-0 pr-8"
      >
        <div className="text-[11px] font-medium text-white truncate leading-tight">
          {workout.name}
        </div>
        {workout.estimated_duration_minutes && (
          <div className="text-[9px] text-neutral-400 mt-0.5">
            {workout.estimated_duration_minutes}min
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute top-1 right-1 flex gap-0.5 bg-neutral-900/80 backdrop-blur-sm rounded border border-neutral-700 p-0.5">
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 hover:bg-white/10 rounded text-blue-400 hover:text-blue-300 transition-colors"
              title="Duplicate"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-white/10 rounded text-red-400 hover:text-red-300 transition-colors"
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
