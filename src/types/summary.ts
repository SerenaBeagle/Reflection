export type WeeklySummary = {
  weekStart: string;
  weekEnd: string;
  summary: string;
  highlights: Array<{
    date: string;
    title: string;
    description: string;
    emotion: string;
  }>;
  peopleMentioned: string[];
  topics: string[];
  emotionStats: Record<string, number>;
};
