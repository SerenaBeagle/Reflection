export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  preferredAIMode: AIMode;
};

export type AIMode = 'best-friend' | 'gentle-listener' | 'reflective-coach' | 'playful-companion';
