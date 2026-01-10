'use client';

import React from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { AppLayout } from '@/components/app-layout';
import { TodayScreen } from '@/components/today-screen';

export default function HomePage() {
  return (
    <ProtectedLayout>
      <AppLayout>
        <TodayScreen />
      </AppLayout>
    </ProtectedLayout>
  );
}
