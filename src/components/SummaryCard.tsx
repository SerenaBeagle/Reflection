import React from 'react';
import { WeeklySummary } from '@/types/summary';
import { EmotionBadge } from './EmotionBadge';

interface SummaryCardProps {
  summary: WeeklySummary;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <div className="rounded-2xl bg-white shadow-lg p-5 mb-4">
      <h2 className="text-lg font-bold mb-2 text-pink-500">本周生活摘要</h2>
      <p className="mb-3 text-gray-700 leading-relaxed">{summary.summary}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {Object.entries(summary.emotionStats).map(([emotion, count]) => (
          <EmotionBadge key={emotion} emotion={emotion} count={count} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {summary.peopleMentioned.map(person => (
          <span key={person} className="bg-pink-50 text-pink-400 px-2 py-1 rounded-full text-xs">{person}</span>
        ))}
        {summary.topics.map(topic => (
          <span key={topic} className="bg-pink-100 text-pink-500 px-2 py-1 rounded-full text-xs">{topic}</span>
        ))}
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">亮点</h3>
        <ul className="space-y-1">
          {summary.highlights.map(h => (
            <li key={h.date + h.title} className="flex items-center gap-2">
              <EmotionBadge emotion={h.emotion} />
              <span className="text-gray-700 text-sm">{h.title} <span className="text-gray-400">({h.date})</span></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
