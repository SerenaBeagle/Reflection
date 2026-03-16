'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/chat');
      }
    };

    void checkSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push('/chat');
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-pink-50 to-white px-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-pink-500 mb-2 text-center">欢迎回来</h1>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {errorMessage ? (
            <p className="text-sm text-rose-500">{errorMessage}</p>
          ) : null}
          <button
            className="mt-2 py-3 rounded-xl bg-pink-400 text-white font-semibold shadow-md hover:bg-pink-500 transition"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="text-center text-sm text-gray-400">
          没有账号？{' '}
          <Link href="/signup" className="text-pink-400 hover:underline">注册</Link>
        </div>
      </div>
    </main>
  );
}
