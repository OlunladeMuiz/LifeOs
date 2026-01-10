'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', href: '/', icon: '☀️' },
  { label: 'Inbox', href: '/inbox', icon: '📥' },
  { label: 'Goals', href: '/goals', icon: '🎯' },
  { label: 'Context', href: '/context', icon: '⚙️' },
  { label: 'History', href: '/history', icon: '📋' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Main content */}
      <div className="flex-1 pb-20">{children}</div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto px-0 flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-4 text-xs font-medium transition-colors ${
                pathname === item.href
                  ? 'text-blue-600 border-t-2 border-blue-600 pt-3'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* User menu header */}
      {user && (
        <div className="fixed top-0 right-6 py-4 text-sm text-gray-600">
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
