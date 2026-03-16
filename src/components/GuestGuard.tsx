'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session) {
        setIsGuest(false);
        setIsChecking(false);
        router.replace('/chat');
        return;
      }

      setIsGuest(true);
      setIsChecking(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      if (session) {
        setIsGuest(false);
        setIsChecking(false);
        router.replace('/chat');
        return;
      }

      setIsGuest(true);
      setIsChecking(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <p className="text-sm text-pink-400">正在检查登录状态...</p>
      </div>
    );
  }

  if (!isGuest) {
    return null;
  }

  return <>{children}</>;
}
