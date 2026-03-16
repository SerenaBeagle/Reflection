import React from 'react';
import { EmotionType } from '@/types/message';

interface CalendarDayCellProps {
  date: string;
  emotion?: EmotionType;
  selected?: boolean;
  onClick?: () => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ date, emotion, selected, onClick }) => {
  const colorMap: Record<EmotionType, string> = {
    happy: 'bg-yellow-200',
    sad: 'bg-blue-100',
    angry: 'bg-red-100',
    anxious: 'bg-orange-100',
    calm: 'bg-green-100',
    excited: 'bg-pink-100',
    lonely: 'bg-gray-100',
    grateful: 'bg-pink-200',
    hopeful: 'bg-green-200',
    confused: 'bg-purple-100',
    neutral: 'bg-gray-50',
  };
  return (
    <button
      className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl border transition
        ${selected ? 'border-pink-400 shadow-lg' : 'border-transparent'}
        ${emotion ? colorMap[emotion] : 'bg-white'}`}
      onClick={onClick}
      type="button"
    >
      <span className="text-xs text-gray-700">{date.split('-')[2]}</span>
      {emotion && <span className="w-2 h-2 rounded-full mt-1" style={{ background: 'rgba(255, 99, 132, 0.6)' }} />}
    </button>
  );
};
