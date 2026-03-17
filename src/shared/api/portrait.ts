import { EmotionType } from '@/types/message';

export type PortraitRequestBody = {
  entries: Array<{
    entry_date: string;
    raw_text: string;
    summary_short: string | null;
    dominant_emotion: EmotionType | null;
  }>;
  startDate: string;
  endDate: string;
};

export type PortraitSuccessResponse = {
  summary: string;
};

export type PortraitErrorResponse = {
  error: string;
};
