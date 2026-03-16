import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, disabled }) => {
  return (
    <div className="flex items-center gap-2 rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <input
        className="flex-1 rounded-2xl bg-transparent px-4 py-3 text-[15px] text-[color:var(--foreground)] outline-none placeholder:text-[#94a3b8]"
        placeholder="说点什么..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSend()}
        disabled={disabled}
      />
      <button
        className="rounded-full bg-[color:var(--ikea-blue)] p-3 text-white transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="发送"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};
