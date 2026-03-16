import React from 'react';

interface DiaryTextAreaProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const DiaryTextArea: React.FC<DiaryTextAreaProps> = ({ value, onChange, onSubmit, placeholder, disabled }) => {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="min-h-[120px] max-h-60 w-full resize-none rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-4 text-[15px] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none placeholder:text-[#94a3b8]"
        placeholder={placeholder || '写下你的心情...'}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
      <button
        className="self-end rounded-full bg-[color:var(--ikea-blue)] px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        type="button"
      >
        提交
      </button>
      <span className="text-xs text-[color:var(--slate)]">写下一点点也可以，我们慢慢整理今天的感受。</span>
    </div>
  );
};
