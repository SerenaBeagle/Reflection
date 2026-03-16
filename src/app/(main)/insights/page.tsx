'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { InsightCard } from '@/components/InsightCard';
import { EmotionBadge } from '@/components/EmotionBadge';
import { supabase } from '@/lib/supabase/client';
import { buildEmotionInsights, buildEmotionTrends, DiaryEntryAggregate } from '@/lib/diary-insights';
import { EmotionInsight, EmotionTrend } from '@/types/emotion';

export default function InsightsPage() {
  const [trends, setTrends] = useState<EmotionTrend[]>([]);
  const [insights, setInsights] = useState<EmotionInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadInsights = async () => {
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

      const rows = (data || []) as DiaryEntryAggregate[];
      setTrends(buildEmotionTrends(rows, today));
      setInsights(buildEmotionInsights(rows));
      setIsLoading(false);
    };

    void loadInsights();
  }, []);

  const frequentEmotions = trends
    .slice()
    .sort((a, b) => {
      const sumA = a.data.reduce((sum, item) => sum + item.value, 0);
      const sumB = b.data.reduce((sum, item) => sum + item.value, 0);
      return sumB - sumA;
    })
    .slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="情感洞察" />
      <main className="flex-1 p-4 bg-gradient-to-b from-white to-pink-50">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-pink-400">正在分析最近情绪...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
            读取洞察失败：{errorMessage}
          </div>
        ) : (
          <>
            <section className="mb-4">
              <h2 className="text-pink-500 font-bold mb-2">本周情绪趋势</h2>
              {trends.length === 0 ? (
                <div className="text-sm text-gray-400">本周还没有足够的数据来生成趋势。</div>
              ) : trends.map(trend => (
                <InsightCard key={trend.emotion} trend={trend} />
              ))}
            </section>
            <section className="mb-4">
              <h2 className="text-pink-500 font-bold mb-2">最近情感片段</h2>
              <div className="flex flex-wrap gap-2">
                {insights.length === 0 ? (
                  <span className="text-sm text-gray-400">写几条日记后，这里会出现你的情绪片段。</span>
                ) : insights.map(insight => (
                  <EmotionBadge key={insight.date + insight.emotion} emotion={insight.emotion} count={insight.intensity} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-pink-500 font-bold mb-2">本周高频情绪</h2>
              <div className="flex gap-2">
                {frequentEmotions.length === 0 ? (
                  <span className="text-sm text-gray-400">暂时还没有高频情绪。</span>
                ) : frequentEmotions.map((trend) => (
                  <EmotionBadge key={trend.emotion} emotion={trend.emotion} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
