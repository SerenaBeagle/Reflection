'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/lib/supabase/client';

type UserPortraitRecord = {
  id: string;
  report_type: 'custom_range' | 'monthly';
  start_date: string;
  end_date: string;
  title: string;
  summary: string;
  created_at: string;
};

export default function PortraitHistoryPage() {
  const [portraits, setPortraits] = useState<UserPortraitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadPortraits = async () => {
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

      const { data, error } = await supabase
        .from('user_portraits')
        .select('id, report_type, start_date, end_date, title, summary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setPortraits(data || []);
      setIsLoading(false);
    };

    void loadPortraits();
  }, []);

  const monthlyPortraits = portraits.filter((portrait) => portrait.report_type === 'monthly');
  const customPortraits = portraits.filter((portrait) => portrait.report_type === 'custom_range');

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="用户画像" />
      <main className="flex-1 bg-[color:var(--background)] p-4">
        <div className="mb-4">
          <Link
            className="text-sm font-medium text-[color:var(--ikea-blue)] underline-offset-4 hover:underline"
            href="/calendar"
          >
            返回日历
          </Link>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-[color:var(--slate)]">正在加载已保存的画像...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
            读取画像失败：{errorMessage}
          </div>
        ) : portraits.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-5 py-8 text-center text-sm text-[color:var(--slate)]">
            还没有保存过用户画像，先去日历页生成一条吧。
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-3 text-sm font-semibold text-[color:var(--ikea-blue-deep)]">月度汇报</div>
              {monthlyPortraits.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-6 text-sm text-[color:var(--slate)]">
                  还没有生成过月度汇报。
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyPortraits.map((portrait) => (
                    <PortraitCard key={portrait.id} portrait={portrait} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold text-[color:var(--ikea-blue-deep)]">自定义画像</div>
              {customPortraits.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-6 text-sm text-[color:var(--slate)]">
                  还没有生成过自定义画像。
                </div>
              ) : (
                <div className="space-y-4">
                  {customPortraits.map((portrait) => (
                    <PortraitCard key={portrait.id} portrait={portrait} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function PortraitCard({ portrait }: { portrait: UserPortraitRecord }) {
  return (
    <div className="rounded-[24px] bg-[color:var(--surface)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-[color:var(--ikea-blue-deep)]">{portrait.title}</div>
          <div className="mt-1 text-xs text-gray-400">
            {portrait.start_date} - {portrait.end_date} · {portrait.report_type === 'monthly' ? '月度汇报' : '自定义画像'}
          </div>
        </div>
        <div className="text-xs text-gray-400">{portrait.created_at.slice(0, 10)}</div>
      </div>
      <div className="mt-4 text-sm leading-7 text-[color:var(--foreground)]">{portrait.summary}</div>
    </div>
  );
}
