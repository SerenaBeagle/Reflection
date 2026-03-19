import { AIMode } from '@/types/user';

export type RealtimeSessionRequest = {
  aiMode: AIMode;
  sdp: string;
};

export type RealtimeSessionErrorResponse = {
  error: string;
};
