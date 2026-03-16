import { DiaryEntry } from '@/types/diary';

export const mockDiaryEntries: DiaryEntry[] = [
  {
    id: 'd1',
    userId: 'u1',
    date: '2026-03-14',
    content: '今天和朋友小聚，聊了很多心事，感觉被理解了。',
    summary: '与朋友的温暖交流让心情变好。',
    dominantEmotion: 'grateful',
    messageCount: 5,
    peopleMentioned: ['小明'],
    topics: ['友情', '情感'],
  },
  {
    id: 'd2',
    userId: 'u1',
    date: '2026-03-13',
    content: '工作有点压力，但努力调整心态。',
    summary: '面对压力，学会自我调节。',
    dominantEmotion: 'anxious',
    messageCount: 3,
    peopleMentioned: [],
    topics: ['工作', '压力'],
  },
];
