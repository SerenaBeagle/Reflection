import React from 'react';
import { ImagePlus, Mic, Send, Square, X } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  imagePreviewUrl?: string | null;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  disabled?: boolean;
  onToggleVoiceInput?: () => void;
  isRecording?: boolean;
  isTranscribing?: boolean;
  voiceSupported?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  imagePreviewUrl,
  onPickImage,
  onClearImage,
  disabled,
  onToggleVoiceInput,
  isRecording,
  isTranscribing,
  voiceSupported,
}) => {
  const micLabel = isTranscribing ? '识别中' : isRecording ? '停止录音' : '语音输入';
  const canUseVoice = Boolean(voiceSupported && onToggleVoiceInput);

  return (
    <div className="rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      {imagePreviewUrl ? (
        <div className="relative mb-2 overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]">
          <img
            src={imagePreviewUrl}
            alt="准备发送的图片"
            className="max-h-52 w-full object-cover"
          />
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-[color:var(--ikea-blue-deep)] shadow-sm"
            onClick={onClearImage}
            disabled={disabled}
            aria-label="移除图片"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3 text-[color:var(--ikea-blue-deep)] transition hover:bg-white">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0] || null)}
            disabled={disabled}
          />
          <ImagePlus className="h-5 w-5" />
        </label>
        <button
          type="button"
          className={`rounded-full border p-3 transition ${
            isRecording
              ? 'border-[#f1b8b8] bg-[#fff1ef] text-[#b4533c]'
              : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--ikea-blue-deep)] hover:bg-white'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={onToggleVoiceInput}
          disabled={disabled || isTranscribing || !canUseVoice}
          aria-label={micLabel}
          title={canUseVoice ? micLabel : '当前浏览器不支持语音输入'}
        >
          {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <input
          className="flex-1 rounded-2xl bg-transparent px-4 py-3 text-[15px] text-[color:var(--foreground)] outline-none placeholder:text-[#94a3b8]"
          placeholder={
            isTranscribing
              ? '正在识别语音...'
              : imagePreviewUrl
                ? '给这张图片配一句话...'
                : '说点什么...'
          }
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          disabled={disabled || isTranscribing}
        />
        <button
          className="rounded-full bg-[color:var(--ikea-blue)] p-3 text-white transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
          onClick={onSend}
          disabled={disabled || isTranscribing || (!value.trim() && !imagePreviewUrl)}
          aria-label="发送"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      {canUseVoice ? (
        <div className="px-1 pt-2 text-xs text-[color:var(--slate)]">
          {isRecording
            ? '正在录音，点方块结束并转成文字。'
            : isTranscribing
              ? '语音已上传，正在转文字。'
              : '点麦克风开始语音输入。'}
        </div>
      ) : (
        <div className="px-1 pt-2 text-xs text-[color:var(--slate)]">
          当前浏览器不支持语音输入，可继续手动输入文字。
        </div>
      )}
    </div>
  );
};
