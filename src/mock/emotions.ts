import { EmotionInsight, EmotionTrend } from '@/types/emotion';

export const mockEmotionInsights: EmotionInsight[] = [
  { date: '2026-03-14', emotion: 'grateful', intensity: 4 },
  { date: '2026-03-13', emotion: 'anxious', intensity: 3 },
  { date: '2026-03-12', emotion: 'happy', intensity: 5 },
];

export const mockEmotionTrends: EmotionTrend[] = [
  {
    emotion: 'happy',
    data: [
      { date: '2026-03-12', value: 5 },
      { date: '2026-03-13', value: 3 },
      { date: '2026-03-14', value: 4 },
    ],
  },
  {
    emotion: 'anxious',
    data: [
      { date: '2026-03-12', value: 2 },
      { date: '2026-03-13', value: 3 },
      { date: '2026-03-14', value: 1 },
    ],
  },
];
