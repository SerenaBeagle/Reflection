'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SummaryCard } from '@/components/SummaryCard';
import { supabase } from '@/lib/supabase/client';
import { buildWeeklySummary, DiaryEntryAggregate } from '@/lib/diary-insights';
import { WeeklySummary } from '@/types/summary';

export default function SummaryPage() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage(authError?.message ?? '未获取到登录用户。');
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);

      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, entry_date, raw_text, summary_short, dominant_emotion')
        .eq('user_id', user.id)
        .gte('entry_date', weekStart.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }))
        .lte('entry_date', today.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }))
        .order('entry_date', { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setSummary(buildWeeklySummary((data || []) as DiaryEntryAggregate[], today));
      setIsLoading(false);
    };

    void loadSummary();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="本周摘要" />
      <main className="flex-1 p-4 bg-gradient-to-b from-white to-pink-50">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-pink-400">正在生成本周摘要...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
            读取摘要失败：{errorMessage}
          </div>
        ) : summary ? (
          <SummaryCard summary={summary} />
        ) : null}
      </main>
    </div>
  );
}
