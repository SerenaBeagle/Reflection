import React from 'react';
import { BottomNav } from '@/components/BottomNav';
import { SidebarNav } from '@/components/SidebarNav';
import { AuthGuard } from '@/components/AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex">
        <SidebarNav />
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full min-h-screen pb-16 md:pb-0">
          {children}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
