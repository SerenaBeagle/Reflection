import { AIMode, User } from './user';

export type Message = {
  id: string;
  threadId: string;
  sender: 'user' | 'ai';
  content: string;
  createdAt: string;
  aiMode?: AIMode;
  emotion?: EmotionType;
};

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'lonely' | 'grateful' | 'hopeful' | 'confused' | 'neutral';
