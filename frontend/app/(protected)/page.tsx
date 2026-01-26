'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/today');
  }, [router]);

  return null;
}
