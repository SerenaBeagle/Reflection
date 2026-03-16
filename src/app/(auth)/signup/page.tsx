'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('两次输入的密码不一致。');
      return;
    }

    setIsSubmitting(true);

    const normalizedUsername = username.trim();
    const displayName = normalizedUsername;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: displayName,
        },
      },
    });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message);
      return;
    }

    await supabase.auth.signOut();

    setIsSubmitting(false);
    setSuccessMessage('注册成功，请回到登录页重新登录。');
    window.location.assign('/login?registered=1');
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-pink-50 to-white px-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-pink-500 mb-2 text-center">创建账号</h1>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            className="px-4 py-3 rounded-xl bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200"
            type="text"
            placeholder="用户名"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="px-4 py-3 rounded-xl bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200"
            type="email"
            placeholder="邮箱"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="px-4 py-3 rounded-xl bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200"
            type="password"
            placeholder="密码"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          <input
            className="px-4 py-3 rounded-xl bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200"
            type="password"
            placeholder="确认密码"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={6}
            required
          />
          {errorMessage ? (
            <p className="text-sm text-rose-500">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          ) : null}
          <button
            className="mt-2 py-3 rounded-xl bg-pink-400 text-white font-semibold shadow-md hover:bg-pink-500 transition"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '创建中...' : '创建账号'}
          </button>
        </form>
        <div className="text-center text-sm text-gray-400">
          已有账号？{' '}
          <Link href="/login" className="text-pink-400 hover:underline">登录</Link>
        </div>
      </div>
    </main>
  );
}
