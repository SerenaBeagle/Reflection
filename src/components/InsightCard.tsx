import React from 'react';
import { EmotionTrend } from '@/types/emotion';
import { EmotionBadge } from './EmotionBadge';

interface InsightCardProps {
  trend: EmotionTrend;
}

export const InsightCard: React.FC<InsightCardProps> = ({ trend }) => {
  // 简单折线图占位
  return (
    <div className="rounded-2xl bg-white shadow-md p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <EmotionBadge emotion={trend.emotion} />
        <span className="font-semibold text-gray-700">情绪趋势</span>
      </div>
      <div className="h-16 flex items-end gap-1">
        {trend.data.map((d) => (
          <div
            key={d.date}
            className="flex-1 bg-pink-100 rounded-t-xl"
            style={{ height: `${d.value * 12}px` }}
            title={d.date}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {trend.data.map(d => (
          <span key={d.date}>{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
};
