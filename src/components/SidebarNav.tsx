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

export const SidebarNav: React.FC = () => {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-20 bg-white border-r shadow-lg py-6 items-center gap-6 h-screen sticky top-0">
      {NAVS.map(nav => {
        const active = pathname.startsWith(nav.href);
        return (
          <Link
            key={nav.href}
            href={nav.href}
            className={`flex flex-col items-center gap-1 px-2 ${active ? 'text-pink-500' : 'text-gray-400'}`}
          >
            <nav.icon className="w-7 h-7" />
            <span className="text-xs">{nav.label}</span>
          </Link>
        );
      })}
    </aside>
  );
};
