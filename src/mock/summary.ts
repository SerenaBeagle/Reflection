import { WeeklySummary } from '@/types/summary';

export const mockWeeklySummary: WeeklySummary = {
  weekStart: '2026-03-10',
  weekEnd: '2026-03-16',
  summary: '本周你经历了情感的起伏，但也收获了温暖和成长。你最常感受到的情绪是“感激”，最强烈的情绪出现在周三。',
  highlights: [
    {
      date: '2026-03-12',
      title: '收到朋友的关心',
      description: '朋友主动发来问候，让你感到被重视。',
      emotion: 'grateful',
    },
    {
      date: '2026-03-13',
      title: '工作压力高峰',
      description: '面对挑战，你依然坚持了下来。',
      emotion: 'anxious',
    },
  ],
  peopleMentioned: ['小明', '同事'],
  topics: ['友情', '工作'],
  emotionStats: {
    grateful: 3,
    anxious: 2,
    happy: 1,
  },
};
