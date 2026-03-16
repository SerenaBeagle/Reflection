import React from 'react';

interface AppHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, right }) => (
  <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[color:var(--surface)]/95 px-4 py-3 backdrop-blur">
    <h1 className="text-lg font-semibold tracking-[0.02em] text-[color:var(--ikea-blue-deep)]">{title}</h1>
    {right && <div>{right}</div>}
  </header>
);
