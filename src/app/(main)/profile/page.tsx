'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { ModeSelector } from '@/components/ModeSelector';
import { supabase } from '@/lib/supabase/client';
import { AIMode } from '@/types/user';

type ProfileRecord = {
  id: string;
  username: string;
  display_name: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [email, setEmail] = useState('');
  const [preferredAIMode] = useState<AIMode>('gentle-listener');

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage(authError?.message ?? '未获取到登录用户信息。');
        setIsLoading(false);
        return;
      }

      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', user.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setEditUsername(data.username);
      setEditDisplayName(data.display_name || '');
      setIsLoading(false);
    };

    void loadProfile();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
    router.push('/login');
    router.refresh();
  };

  const handleSaveProfile = async () => {
    if (!profile) {
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: editUsername.trim(),
        display_name: editDisplayName.trim() || null,
      })
      .eq('id', profile.id)
      .select('id, username, display_name')
      .single();

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setProfile(data);
    setSaveMessage('个人资料已更新。');
  };

  const avatarLabel = (profile?.display_name || profile?.username || email || '?')
    .charAt(0)
    .toUpperCase();

  const displayName = profile?.display_name || profile?.username || '未设置昵称';
  const username = profile?.username ? `@${profile.username}` : '未设置用户名';

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="我的" />
      <main className="flex-1 p-4 bg-[color:var(--background)]">
        <div className="rounded-[28px] bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] flex flex-col gap-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-[color:var(--slate)]">正在加载个人资料...</div>
          ) : errorMessage ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-500">
              读取个人资料失败：{errorMessage}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--ikea-blue-soft)] text-2xl font-bold text-[color:var(--ikea-blue-deep)]">
                  {avatarLabel}
                </div>
                <div>
                  <div className="text-lg font-bold text-[color:var(--ikea-blue-deep)]">{displayName}</div>
                  <div className="text-xs text-gray-400">{username}</div>
                  <div className="text-xs text-gray-400">{email || '未绑定邮箱'}</div>
                </div>
              </div>
              <div className="grid gap-3">
                <label className="text-sm text-gray-500">
                  昵称
                  <input
                    className="mt-1 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-white px-4 py-3 outline-none"
                    value={editDisplayName}
                    onChange={(event) => setEditDisplayName(event.target.value)}
                    placeholder="给自己一个显示昵称"
                  />
                </label>
                <label className="text-sm text-gray-500">
                  用户名
                  <input
                    className="mt-1 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-white px-4 py-3 outline-none"
                    value={editUsername}
                    onChange={(event) => setEditUsername(event.target.value)}
                    placeholder="username"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-full bg-[color:var(--ikea-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--ikea-blue-deep)] disabled:opacity-50"
                    onClick={handleSaveProfile}
                    type="button"
                    disabled={isSaving || !profile}
                  >
                    {isSaving ? '保存中...' : '保存资料'}
                  </button>
                  {saveMessage ? (
                    <span className="text-sm text-emerald-600">{saveMessage}</span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">偏好 AI 回复风格</div>
                <ModeSelector value={preferredAIMode} onChange={() => {}} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">主题</span>
              <button className="px-3 py-1 rounded-full bg-pink-50 text-pink-400 text-xs">浅色</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">隐私设置</span>
              <button className="px-3 py-1 rounded-full bg-pink-50 text-pink-400 text-xs">管理</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">导出数据</span>
              <button className="px-3 py-1 rounded-full bg-pink-50 text-pink-400 text-xs">导出</button>
            </div>
          </div>
          <button
            className="mt-2 rounded-xl bg-[color:var(--ikea-blue)] py-2 text-white font-semibold shadow-md transition hover:bg-[color:var(--ikea-blue-deep)]"
            onClick={handleSignOut}
            type="button"
            disabled={isSigningOut}
          >
            {isSigningOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </main>
    </div>
  );
}
