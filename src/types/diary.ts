import { EmotionType } from './message';

export type DiaryEntry = {
  id: string;
  userId: string;
  date: string;
  content: string;
  summary: string;
  dominantEmotion: EmotionType;
  messageCount: number;
  peopleMentioned: string[];
  topics: string[];
};
