import { EmotionInsight, EmotionTrend } from '@/types/emotion';
import { EmotionType } from '@/types/message';
import { WeeklySummary } from '@/types/summary';

export type DiaryEntryAggregate = {
  id: string;
  entry_date: string;
  raw_text: string;
  summary_short: string | null;
  dominant_emotion: EmotionType | null;
};

const EMOTIONS: EmotionType[] = [
  'happy',
  'sad',
  'angry',
  'anxious',
  'calm',
  'excited',
  'lonely',
  'grateful',
  'hopeful',
  'confused',
  'neutral',
];

export function buildWeeklySummary(entries: DiaryEntryAggregate[], today: Date): WeeklySummary {
  const emotionStats = Object.fromEntries(
    EMOTIONS.map((emotion) => [emotion, 0])
  ) as Record<string, number>;

  entries.forEach((entry) => {
    const emotion = entry.dominant_emotion || 'neutral';
    emotionStats[emotion] = (emotionStats[emotion] || 0) + 1;
  });

  const highlights = [...entries]
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    .slice(0, 3)
    .map((entry) => ({
      date: entry.entry_date,
      title: entry.summary_short || buildShortTitle(entry.raw_text),
      description: entry.raw_text,
      emotion: entry.dominant_emotion || 'neutral',
    }));

  const topEmotion = Object.entries(emotionStats)
    .sort((a, b) => b[1] - a[1])[0];

  const summary = entries.length === 0
    ? '这一周还没有记录，试着写下一点今天的感受吧。'
    : `本周你记录了 ${entries.length} 条心情，最常出现的情绪是“${topEmotion?.[0] || 'neutral'}”。最近的状态关键词是 ${buildKeywordSummary(entries)}。`;

  return {
    weekStart: formatDate(offsetDate(today, -6)),
    weekEnd: formatDate(today),
    summary,
    highlights,
    peopleMentioned: [],
    topics: extractTopics(entries),
    emotionStats,
  };
}

export function buildEmotionInsights(entries: DiaryEntryAggregate[]): EmotionInsight[] {
  return [...entries]
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    .slice(0, 6)
    .map((entry) => ({
      date: entry.entry_date,
      emotion: entry.dominant_emotion || 'neutral',
      intensity: Math.min(5, Math.max(1, entry.raw_text.trim().length > 80 ? 5 : Math.ceil(entry.raw_text.trim().length / 20))),
    }));
}

export function buildEmotionTrends(entries: DiaryEntryAggregate[], today: Date): EmotionTrend[] {
  const last7Days = Array.from({ length: 7 }, (_, index) => formatDate(offsetDate(today, -6 + index)));
  const topEmotions = Object.entries(
    entries.reduce<Record<string, number>>((acc, entry) => {
      const emotion = entry.dominant_emotion || 'neutral';
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion as EmotionType);

  const emotions = topEmotions.length > 0 ? topEmotions : ['neutral'];

  return emotions.map((emotion) => ({
    emotion,
    data: last7Days.map((date) => ({
      date,
      value: entries.filter((entry) => entry.entry_date === date && (entry.dominant_emotion || 'neutral') === emotion).length,
    })),
  }));
}

function buildShortTitle(text: string) {
  return text.trim().length > 18 ? `${text.trim().slice(0, 18)}...` : text.trim();
}

function buildKeywordSummary(entries: DiaryEntryAggregate[]) {
  const keywords = extractTopics(entries);
  return keywords.length > 0 ? keywords.slice(0, 3).join('、') : '日常、心情、自我观察';
}

function extractTopics(entries: DiaryEntryAggregate[]) {
  const presetTopics = ['工作', '学习', '朋友', '家人', '感情', '睡眠', '压力', '成长', '生活'];

  return presetTopics.filter((topic) =>
    entries.some((entry) => entry.raw_text.includes(topic))
  );
}

function offsetDate(date: Date, offsetDays: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offsetDays);
  return next;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}
