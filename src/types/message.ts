import { AIMode } from './user';

export type Message = {
  id: string;
  threadId: string;
  sender: 'user' | 'ai';
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  transcript?: string | null;
  kind?: 'text' | 'audio';
  createdAt: string;
  aiMode?: AIMode;
  emotion?: EmotionType;
};

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'lonely' | 'grateful' | 'hopeful' | 'confused' | 'neutral';
