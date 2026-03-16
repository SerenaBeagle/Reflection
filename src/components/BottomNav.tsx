'use client';

import React from 'react';
import { MessageCircle, Calendar, BarChart2, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVS = [
  { label: '聊天', icon: MessageCircle, href: '/chat' },
  { label: '日历', icon: Calendar, href: '/calendar' },
  { label: '洞察', icon: BarChart2, href: '/insights' },
  { label: '我的', icon: User, href: '/profile' },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t shadow-lg flex justify-around py-2 md:hidden">
      {NAVS.map(nav => {
        const active = pathname.startsWith(nav.href);
        return (
          <Link
            key={nav.href}
            href={nav.href}
            className={`flex flex-col items-center gap-0.5 px-2 ${active ? 'text-pink-500' : 'text-gray-400'}`}
          >
            <nav.icon className="w-6 h-6" />
            <span className="text-xs">{nav.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
