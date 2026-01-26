'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import type { Task } from '@/lib/api-types';

export default function HistoryPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      const res = await apiClient.getTasks('DONE');
      if (res.ok && res.data) {
        setTasks(res.data.tasks);
      } else {
        setError(res.message || 'Unable to load history.');
      }
      setLoading(false);
    };
    loadHistory();
  }, [user]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-4xl font-light mb-2">History</h1>
      <p className="text-gray-600 mb-6">Your completed tasks.</p>

      {loading && <p className="text-gray-600">Loading…</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No completed tasks yet.</p>
          <Link
            href="/inbox"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Inbox
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between">
              <p className="text-base text-gray-900">{task.title}</p>
              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                Done
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Effort: {task.effort ?? '-'} min · Impact: {task.impact ?? '-'}
              {task.goal && ` · Goal: ${task.goal.title}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
