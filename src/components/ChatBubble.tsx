'use client';

import { cn } from '@/lib/utils';
import { Message } from '@/types/message';
import { AudioLines, Pause, Play, UserCircle } from 'lucide-react';
import React from 'react';
import { AIMode } from '@/types/user';

interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  aiMode?: AIMode;
  timeLabel?: string;
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

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, aiMode = 'gentle-listener', timeLabel }) => {
  const modeStyle = MODE_STYLES[aiMode];
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showTranscriptAction, setShowTranscriptAction] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const longPressTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const hasAudio = Boolean(message.audioUrl);
  const transcriptText = message.transcript?.trim() || message.content?.trim() || '';

  const handleToggleAudio = () => {
    if (!message.audioUrl) {
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(message.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('play', () => setIsPlaying(true));
    }

    if (audioRef.current.paused) {
      void audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleStartLongPress = () => {
    if (!hasAudio || !transcriptText) {
      return;
    }

    longPressTimerRef.current = window.setTimeout(() => {
      setShowTranscriptAction(true);
    }, 420);
  };

  const handleCancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

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
        onContextMenu={(event) => {
          if (!hasAudio || !transcriptText) {
            return;
          }

          event.preventDefault();
          setShowTranscriptAction(true);
        }}
        onTouchStart={handleStartLongPress}
        onTouchEnd={handleCancelLongPress}
        onTouchMove={handleCancelLongPress}
      >
        {message.imageUrl ? (
          <img
            src={message.imageUrl}
            alt="聊天中分享的图片"
            className="mb-3 max-h-72 w-full rounded-2xl object-cover"
          />
        ) : null}
        {hasAudio ? (
          <button
            type="button"
            onClick={handleToggleAudio}
            className={cn(
              'flex min-w-[172px] items-center gap-3 rounded-2xl px-3 py-2 text-left transition',
              isUser ? 'bg-white/12 hover:bg-white/18' : 'bg-white/70 hover:bg-white'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                isUser ? 'bg-white/18' : 'bg-[color:var(--ikea-blue)] text-white'
              )}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <AudioLines className="h-4 w-4" />
                语音消息
              </span>
              <span className={cn('mt-1 block text-xs', isUser ? 'text-white/80' : 'text-[#60758b]')}>
                {formatAudioDuration(message.audioDurationSeconds)}
              </span>
            </span>
          </button>
        ) : message.content ? (
          <div>{message.content}</div>
        ) : null}
        {showTranscriptAction ? (
          <div className="mt-3 flex justify-start">
            <button
              type="button"
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                isUser
                  ? 'bg-white/16 text-white hover:bg-white/20'
                  : 'bg-white text-[color:var(--ikea-blue-deep)] hover:bg-[#f8fbff]'
              )}
              onClick={() => {
                setShowTranscript((current) => !current);
                setShowTranscriptAction(false);
              }}
            >
              {showTranscript ? '收起转文字' : '查看转文字'}
            </button>
          </div>
        ) : null}
        {hasAudio && showTranscript && transcriptText ? (
          <div
            className={cn(
              'mt-3 rounded-2xl px-3 py-2 text-sm leading-6',
              isUser ? 'bg-white/10 text-white/90' : 'bg-white/80 text-[#35506a]'
            )}
          >
            {transcriptText}
          </div>
        ) : null}
        {timeLabel ? (
          <div className={cn('mt-2 text-[11px]', isUser ? 'text-white/70 text-right' : 'text-[#60758b]')}>
            {timeLabel}
          </div>
        ) : null}
      </div>
      {isUser && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-muted)]">
          <UserCircle className="h-5 w-5 text-[color:var(--slate)]" />
        </div>
      )}
    </div>
  );
};

function formatAudioDuration(value?: number | null) {
  if (!value || value < 1) {
    return '1"';
  }

  return `${Math.round(value)}"`;
}
