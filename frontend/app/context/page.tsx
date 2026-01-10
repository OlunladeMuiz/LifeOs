'use client';

import React from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { AppLayout } from '@/components/app-layout';

export default function ContextPage() {
  return (
    <ProtectedLayout>
      <AppLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <h1 className="text-5xl font-light mb-4">Context</h1>
          <p className="text-gray-600 text-lg">
            Set your daily context to get personalized recommendations.
          </p>
        </div>
      </AppLayout>
    </ProtectedLayout>
  );
}
