import { EmotionType } from './message';

export type EmotionInsight = {
  date: string;
  emotion: EmotionType;
  intensity: number; // 1-5
  notes?: string;
};

export type EmotionTrend = {
  emotion: EmotionType;
  data: { date: string; value: number }[];
};
