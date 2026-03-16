'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/diary-insights';
import { EmotionType } from '@/types/message';

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

type DiaryEntryRecord = {
  id: string;
  entry_date: string;
  raw_text: string;
  summary_short: string | null;
  dominant_emotion: EmotionType | null;
  source_message_id: string | null;
};

export default function CalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today.getDate());
  const [entries, setEntries] = useState<DiaryEntryRecord[]>([]);
  const [userId, setUserId] = useState('');
  const [rangeStart, setRangeStart] = useState(() => formatDate(new Date()));
  const [rangeEnd, setRangeEnd] = useState(() => formatDate(new Date()));
  const [showPortraitGenerator, setShowPortraitGenerator] = useState(false);
  const [portraitSummary, setPortraitSummary] = useState('');
  const [portraitError, setPortraitError] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const days = daysInMonth(year, month);

  useEffect(() => {
    const loadEntries = async () => {
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

      setUserId(user.id);

      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const monthEnd = `${year}-${month.toString().padStart(2, '0')}-${days.toString().padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, entry_date, raw_text, summary_short, dominant_emotion, source_message_id')
        .eq('user_id', user.id)
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setEntries(data || []);
      setRangeStart(monthStart);
      setRangeEnd(monthEnd);
      setSelected((current) => Math.min(current, days));
      setIsLoading(false);
    };

    void loadEntries();
  }, [days, month, year]);

  const handleGeneratePortrait = async () => {
    if (!userId) {
      return;
    }

    setIsGeneratingPortrait(true);
    setPortraitError('');
    setPortraitSummary('');

    const { data, error } = await supabase
      .from('diary_entries')
      .select('entry_date, raw_text, summary_short, dominant_emotion')
      .eq('user_id', userId)
      .gte('entry_date', rangeStart)
      .lte('entry_date', rangeEnd)
      .order('entry_date', { ascending: true });

    if (error) {
      setIsGeneratingPortrait(false);
      setPortraitError(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setIsGeneratingPortrait(false);
      setPortraitError('这个时间区间里还没有日记记录。');
      return;
    }

    const response = await fetch('/api/profile-portrait', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries: data,
        startDate: rangeStart,
        endDate: rangeEnd,
      }),
    });

    const payload = await response.json();
    setIsGeneratingPortrait(false);

    if (!response.ok) {
      setPortraitError(payload?.error || '生成用户画像失败。');
      return;
    }

    const summary = payload.summary || '';
    setPortraitSummary(summary);

    const { error: saveError } = await supabase
      .from('user_portraits')
      .insert({
        user_id: userId,
        report_type: 'custom_range',
        start_date: rangeStart,
        end_date: rangeEnd,
        title: `${rangeStart} - ${rangeEnd} 用户画像`,
        summary,
        tone: 'gentle',
        source_entry_count: data.length,
        dominant_emotions: buildDominantEmotions(data),
        keywords: buildKeywords(data),
      });

    if (saveError) {
      setPortraitError(`画像已生成，但保存失败：${saveError.message}`);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    if (!userId) {
      return;
    }

    const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const monthEnd = `${year}-${month.toString().padStart(2, '0')}-${days.toString().padStart(2, '0')}`;

    setIsGeneratingMonthly(true);
    setPortraitError('');
    setPortraitSummary('');

    const { data, error } = await supabase
      .from('diary_entries')
      .select('entry_date, raw_text, summary_short, dominant_emotion')
      .eq('user_id', userId)
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd)
      .order('entry_date', { ascending: true });

    if (error) {
      setIsGeneratingMonthly(false);
      setPortraitError(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setIsGeneratingMonthly(false);
      setPortraitError('这个月份里还没有日记记录，暂时不能生成月度汇报。');
      return;
    }

    const response = await fetch('/api/profile-portrait', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries: data,
        startDate: monthStart,
        endDate: monthEnd,
      }),
    });

    const payload = await response.json();
    setIsGeneratingMonthly(false);

    if (!response.ok) {
      setPortraitError(payload?.error || '生成月度汇报失败。');
      return;
    }

    const summary = payload.summary || '';
    setPortraitSummary(summary);

    const { data: existingMonthly, error: existingError } = await supabase
      .from('user_portraits')
      .select('id')
      .eq('user_id', userId)
      .eq('report_type', 'monthly')
      .eq('start_date', monthStart)
      .eq('end_date', monthEnd)
      .maybeSingle();

    if (existingError) {
      setPortraitError(`月报已生成，但检查历史记录时失败：${existingError.message}`);
      return;
    }

    if (existingMonthly) {
      const { error: updateError } = await supabase
        .from('user_portraits')
        .update({
          title: buildMonthlyTitle(year, month),
          summary,
          tone: 'gentle',
          source_entry_count: data.length,
          dominant_emotions: buildDominantEmotions(data),
          keywords: buildKeywords(data),
        })
        .eq('id', existingMonthly.id);

      if (updateError) {
        setPortraitError(`月报已生成，但更新保存失败：${updateError.message}`);
        return;
      }

      return;
    }

    const { error: saveError } = await supabase
      .from('user_portraits')
      .insert({
        user_id: userId,
        report_type: 'monthly',
        start_date: monthStart,
        end_date: monthEnd,
        title: buildMonthlyTitle(year, month),
        summary,
        tone: 'gentle',
        source_entry_count: data.length,
        dominant_emotions: buildDominantEmotions(data),
        keywords: buildKeywords(data),
      });

    if (saveError) {
      setPortraitError(`月报已生成，但保存失败：${saveError.message}`);
    }
  };

  const diaryMap = useMemo(() => {
    const map: Record<number, DiaryEntryRecord> = {};

    entries.forEach((entry) => {
      const day = parseInt(entry.entry_date.split('-')[2], 10);

      if (!map[day]) {
        map[day] = entry;
      }
    });

    return map;
  }, [entries]);

  const entryCountMap = useMemo(() => {
    const map: Record<number, number> = {};

    entries.forEach((entry) => {
      const day = parseInt(entry.entry_date.split('-')[2], 10);
      map[day] = (map[day] || 0) + 1;
    });

    return map;
  }, [entries]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => parseInt(entry.entry_date.split('-')[2], 10) === selected),
    [entries, selected]
  );

  const monthLabel = `${year} 年 ${month.toString().padStart(2, '0')} 月`;

  const handlePrevMonth = () => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="日历" />
      <main className="flex-1 bg-[color:var(--background)] p-4">
        <div className="mb-4 flex items-center justify-between rounded-[24px] bg-[color:var(--surface)] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <button
            className="rounded-full border border-[color:var(--border-subtle)] px-3 py-1.5 text-sm text-[color:var(--ikea-blue-deep)] transition hover:border-[color:var(--ikea-blue)]"
            onClick={handlePrevMonth}
            type="button"
          >
            上个月
          </button>
          <div className="text-sm font-semibold text-[color:var(--ikea-blue-deep)]">{monthLabel}</div>
          <button
            className="rounded-full border border-[color:var(--border-subtle)] px-3 py-1.5 text-sm text-[color:var(--ikea-blue-deep)] transition hover:border-[color:var(--ikea-blue)]"
            onClick={handleNextMonth}
            type="button"
          >
            下个月
          </button>
        </div>
        <div className="mb-4 grid grid-cols-7 gap-2">
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const entry = diaryMap[day];
            return (
              <CalendarDayCell
                key={day}
                date={`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`}
                emotion={entry?.dominant_emotion ?? undefined}
                selected={selected === day}
                onClick={() => setSelected(day)}
              />
            );
          })}
        </div>

        {isLoading ? (
          <div className="mt-8 text-center text-sm text-[color:var(--slate)]">正在加载日记...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
            读取日记失败：{errorMessage}
          </div>
        ) : selectedEntries.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="font-bold text-[color:var(--ikea-blue-deep)]">
                {month.toString().padStart(2, '0')} 月 {selected.toString().padStart(2, '0')} 日
              </div>
              <div className="text-xs text-gray-400">{entryCountMap[selected] || selectedEntries.length} 条日记</div>
            </div>
            {selectedEntries.map((entry, index) => (
              <div key={entry.id} className="rounded-[24px] bg-[color:var(--surface)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="font-bold text-[color:var(--ikea-blue-deep)]">
                    {entry.summary_short || `第 ${index + 1} 条心情记录`}
                  </div>
                  <span className="rounded-full bg-[color:var(--ikea-blue-soft)] px-2 py-1 text-xs text-[color:var(--ikea-blue-deep)]">
                    {entry.dominant_emotion || 'neutral'}
                  </span>
                </div>
                <div className="whitespace-pre-line text-sm text-gray-700">{entry.raw_text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center text-gray-400">这一天还没有日记哦～</div>
        )}

        <section className="mt-6 rounded-[28px] bg-[color:var(--surface)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-full bg-[color:var(--ikea-blue)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[color:var(--ikea-blue-deep)]"
              onClick={() => setShowPortraitGenerator((current) => !current)}
              type="button"
            >
              {showPortraitGenerator ? '收起生成器' : '生成用户画像'}
            </button>
            <Link
              className="rounded-full border border-[color:var(--border-subtle)] bg-white px-4 py-3 text-center text-sm font-medium text-[color:var(--ikea-blue-deep)] transition hover:border-[color:var(--ikea-blue)]"
              href="/calendar/portraits"
            >
              浏览用户画像
            </Link>
            <button
              className="rounded-full border border-[color:var(--ikea-blue)] bg-[color:var(--ikea-blue-soft)] px-4 py-3 text-sm font-medium text-[color:var(--ikea-blue-deep)] transition hover:bg-[color:var(--surface-muted)] disabled:opacity-50"
              onClick={handleGenerateMonthlyReport}
              type="button"
              disabled={isGeneratingMonthly}
            >
              {isGeneratingMonthly ? '生成月报中...' : '生成本月月度汇报'}
            </button>
          </div>

          {showPortraitGenerator ? (
            <div className="mt-4 rounded-[24px] border border-[color:var(--border-subtle)] bg-white px-4 py-4">
              <div className="text-base font-semibold text-[color:var(--ikea-blue-deep)]">生成一段新的用户画像</div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--slate)]">
                选好时间区间后，我会根据这段时间的日记，为你生成一段温和、面向你的自我观察总结。
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-500">
                  开始日期
                  <input
                    className="mt-1 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-white px-4 py-3 outline-none"
                    type="date"
                    value={rangeStart}
                    onChange={(event) => setRangeStart(event.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-500">
                  结束日期
                  <input
                    className="mt-1 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-white px-4 py-3 outline-none"
                    type="date"
                    value={rangeEnd}
                    onChange={(event) => setRangeEnd(event.target.value)}
                  />
                </label>
              </div>
              <button
                className="mt-4 rounded-full bg-[color:var(--ikea-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
                onClick={handleGeneratePortrait}
                type="button"
                disabled={isGeneratingPortrait}
              >
                {isGeneratingPortrait ? '生成中...' : '确认生成'}
              </button>
              {portraitError ? (
                <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">{portraitError}</div>
              ) : null}
              {portraitSummary ? (
                <div className="mt-4 rounded-[24px] bg-[color:var(--ice-blue)] px-4 py-4 text-sm leading-7 text-[color:var(--foreground)]">
                  {portraitSummary}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function buildDominantEmotions(entries: Array<{ dominant_emotion: EmotionType | null }>) {
  const counts = entries.reduce<Record<string, number>>((acc, entry) => {
    const emotion = entry.dominant_emotion || 'neutral';
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, count]) => ({ emotion, count }));
}

function buildKeywords(entries: Array<{ raw_text: string }>) {
  const presetTopics = ['工作', '学习', '朋友', '家人', '感情', '睡眠', '压力', '成长', '生活'];

  return presetTopics.filter((topic) =>
    entries.some((entry) => entry.raw_text.includes(topic))
  );
}

function buildMonthlyTitle(year: number, month: number) {
  return `${year} 年 ${month.toString().padStart(2, '0')} 月月度汇报`;
}
