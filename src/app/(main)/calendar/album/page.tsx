'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/lib/supabase/client';

type AlbumImageRecord = {
  id: string;
  content: string;
  image_url: string;
  created_at: string;
};

export default function AlbumPage() {
  const [images, setImages] = useState<AlbumImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadImages = async () => {
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
        .from('messages')
        .select('id, content, image_url, created_at')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setImages(((data || []).filter((item) => item.image_url) as AlbumImageRecord[]));
      setIsLoading(false);
    };

    void loadImages();
  }, []);

  const groupedImages = useMemo(() => {
    return images.reduce<Record<string, AlbumImageRecord[]>>((acc, image) => {
      const key = image.created_at.slice(0, 10);
      acc[key] = acc[key] || [];
      acc[key].push(image);
      return acc;
    }, {});
  }, [images]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="相册" />
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
          <div className="py-8 text-center text-sm text-[color:var(--slate)]">正在加载你的相册...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
            读取相册失败：{errorMessage}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-5 py-8 text-center text-sm text-[color:var(--slate)]">
            你还没有分享过图片，去聊天里发一张吧。
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedImages).map(([date, group]) => (
              <section key={date}>
                <div className="mb-3 text-sm font-semibold text-[color:var(--ikea-blue-deep)]">{date}</div>
                <div className="grid grid-cols-2 gap-3">
                  {group.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-[24px] bg-[color:var(--surface)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <img src={image.image_url} alt="相册中的图片" className="h-44 w-full object-cover" />
                      <div className="px-3 py-3">
                        <div className="text-xs text-gray-400">{formatAlbumTime(image.created_at)}</div>
                        {image.content ? (
                          <div className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--foreground)]">{image.content}</div>
                        ) : (
                          <div className="mt-1 text-sm text-[color:var(--slate)]">没有附带文字。</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function formatAlbumTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
