import { Message } from '@/types/message';
import { AIMode } from '@/types/user';

export type ChatRequestBody = {
  message: string;
  messages: Message[];
  aiMode: AIMode;
  mode: 'chat' | 'diary';
  imageUrl?: string | null;
};

export type ChatErrorResponse = {
  error: string;
};
