'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';

export default function ProtectedRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, mounted, router]);

  // Show spinner until hydrated and auth resolved
  if (!mounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-3">
          <p className="text-gray-900 font-medium">Can’t reach the API server.</p>
          <p className="text-gray-600 text-sm">Start the backend, then refresh this page.</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
