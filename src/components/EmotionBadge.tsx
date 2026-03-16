import React from 'react';
import { EmotionType } from '@/types/message';

const EMOTION_COLORS: Record<EmotionType | string, string> = {
  happy: 'bg-yellow-200 text-yellow-700',
  sad: 'bg-blue-100 text-blue-500',
  angry: 'bg-red-100 text-red-500',
  anxious: 'bg-orange-100 text-orange-500',
  calm: 'bg-green-100 text-green-500',
  excited: 'bg-pink-100 text-pink-500',
  lonely: 'bg-gray-100 text-gray-500',
  grateful: 'bg-pink-200 text-pink-700',
  hopeful: 'bg-green-200 text-green-700',
  confused: 'bg-purple-100 text-purple-500',
  neutral: 'bg-gray-50 text-gray-400',
  'gentle-listener': 'bg-pink-50 text-pink-400',
  'best-friend': 'bg-pink-100 text-pink-500',
  'reflective-coach': 'bg-blue-50 text-blue-400',
  'playful-companion': 'bg-yellow-50 text-yellow-400',
};

interface EmotionBadgeProps {
  emotion: EmotionType | string;
  count?: number;
}

export const EmotionBadge: React.FC<EmotionBadgeProps> = ({ emotion, count }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${EMOTION_COLORS[emotion] || 'bg-gray-100 text-gray-400'}`}>
    {emotion}
    {count !== undefined && <span className="ml-1">×{count}</span>}
  </span>
);
