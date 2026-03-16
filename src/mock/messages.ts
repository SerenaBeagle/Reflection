import { Message } from '@/types/message';

export const mockMessages: Message[] = [
  {
    id: 'm1',
    threadId: 't1',
    sender: 'user',
    content: '今天心情有点低落，感觉没人懂我。',
    createdAt: '2026-03-14T09:00:00Z',
    emotion: 'sad',
  },
  {
    id: 'm2',
    threadId: 't1',
    sender: 'ai',
    content: '我在这里陪着你，想聊聊发生了什么吗？',
    createdAt: '2026-03-14T09:01:00Z',
    aiMode: 'gentle-listener',
    emotion: 'gentle-listener',
  },
  {
    id: 'm3',
    threadId: 't1',
    sender: 'user',
    content: '其实也没什么大事，就是有点孤单。',
    createdAt: '2026-03-14T09:02:00Z',
    emotion: 'lonely',
  },
  {
    id: 'm4',
    threadId: 't1',
    sender: 'ai',
    content: '孤单的时候可以和我说说话，我一直都在。',
    createdAt: '2026-03-14T09:03:00Z',
    aiMode: 'gentle-listener',
    emotion: 'gentle-listener',
  },
];
