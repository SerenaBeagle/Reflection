import React from 'react';
import { ImagePlus, Send, X } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  imagePreviewUrl?: string | null;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  imagePreviewUrl,
  onPickImage,
  onClearImage,
  disabled,
}) => {
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
        <input
          className="flex-1 rounded-2xl bg-transparent px-4 py-3 text-[15px] text-[color:var(--foreground)] outline-none placeholder:text-[#94a3b8]"
          placeholder={imagePreviewUrl ? '给这张图片配一句话...' : '说点什么...'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          disabled={disabled}
        />
        <button
          className="rounded-full bg-[color:var(--ikea-blue)] p-3 text-white transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
          onClick={onSend}
          disabled={disabled || (!value.trim() && !imagePreviewUrl)}
          aria-label="发送"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
