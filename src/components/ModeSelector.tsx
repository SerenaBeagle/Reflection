import React from 'react';
import { AIMode } from '@/types/user';

const MODES: { label: string; value: AIMode }[] = [
  { label: '闺蜜', value: 'best-friend' },
  { label: '温柔聆听', value: 'gentle-listener' },
  { label: '反思教练', value: 'reflective-coach' },
  { label: '活泼陪伴', value: 'playful-companion' },
];

interface ModeSelectorProps {
  value: AIMode;
  onChange: (mode: AIMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2 py-1">
      {MODES.map(mode => (
        <button
          key={mode.value}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition
            ${value === mode.value
              ? 'border-[color:var(--ikea-blue)] bg-[color:var(--ikea-blue)] text-white shadow-[0_8px_24px_rgba(0,88,163,0.18)]'
              : 'border-[color:var(--border-subtle)] bg-[color:var(--surface)] text-[color:var(--slate)] hover:border-[color:var(--ikea-blue)] hover:text-[color:var(--ikea-blue)]'}`}
          onClick={() => onChange(mode.value)}
          type="button"
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};
