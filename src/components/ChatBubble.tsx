import { cn } from '@/lib/utils';
import { Message } from '@/types/message';
import { UserCircle } from 'lucide-react';
import React from 'react';
import { AIMode } from '@/types/user';

interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  aiMode?: AIMode;
}

const MODE_STYLES: Record<AIMode, { bubble: string; avatar: string; label: string }> = {
  'best-friend': {
    bubble: 'bg-[#e6f0f8] text-[#23415f]',
    avatar: 'bg-[#b9d2ea] text-[#0f3d67]',
    label: '闺',
  },
  'gentle-listener': {
    bubble: 'bg-[#edf4fa] text-[#24445f]',
    avatar: 'bg-[#d5e5f4] text-[#003b6f]',
    label: '听',
  },
  'reflective-coach': {
    bubble: 'bg-[#e7eef5] text-[#31485f]',
    avatar: 'bg-[#cad9e8] text-[#29415a]',
    label: '思',
  },
  'playful-companion': {
    bubble: 'bg-[#dcecf7] text-[#27506c]',
    avatar: 'bg-[#bdd9ee] text-[#1d4b68]',
    label: '伴',
  },
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, aiMode = 'gentle-listener' }) => {
  const modeStyle = MODE_STYLES[aiMode];

  return (
    <div className={cn('mb-3 flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold', modeStyle.avatar)}>
          <span>{modeStyle.label}</span>
        </div>
      )}
      <div
        className={cn(
          'max-w-[72vw] rounded-[22px] px-4 py-3 text-[15px] leading-6 shadow-sm whitespace-pre-line md:max-w-md',
          isUser
            ? 'rounded-br-md bg-[color:var(--ikea-blue-deep)] text-white'
            : `rounded-bl-md ${modeStyle.bubble}`,
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-muted)]">
          <UserCircle className="h-5 w-5 text-[color:var(--slate)]" />
        </div>
      )}
    </div>
  );
};
