'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import type { Task, TaskStatus, CreateTaskRequest } from '@/lib/api-types';

interface GoalOption {
  id: string;
  title: string;
}

// Effort options matching Figma design
const EFFORT_OPTIONS = [
  { value: 15, label: 'Quick (15 min)' },
  { value: 30, label: 'Short (30 min)' },
  { value: 60, label: 'Medium (1 hour)' },
  { value: 120, label: 'Medium (2 hours)' },
  { value: 240, label: 'Long (4 hours)' },
  { value: 480, label: 'Full day (8 hours)' },
];

// Impact options matching Figma design
const IMPACT_OPTIONS = [
  { value: 20, label: '1 - Low' },
  { value: 40, label: '2 - Medium' },
  { value: 60, label: '3 - High' },
  { value: 80, label: '4 - Very High' },
  { value: 100, label: '5 - Critical' },
];

export default function InboxPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    effort: 120, // Default: Medium (2 hours)
    impact: 40, // Default: 2 - Medium
    goalId: '',
    deadline: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [tasksRes, goalsRes] = await Promise.all([
      apiClient.getTasks(),
      apiClient.getGoals(),
    ]);

    if (tasksRes.ok && tasksRes.data) {
      setTasks(tasksRes.data.tasks);
    } else {
      setError(tasksRes.message || 'Unable to load tasks.');
    }

    if (goalsRes.ok && goalsRes.data) {
      setGoals(goalsRes.data.goals.map((g) => ({ id: g.id, title: g.title })));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    setSaving(true);
    setError(null);
    
    const payload: CreateTaskRequest = {
      title: form.title.trim(),
      effort: form.effort,
      impact: form.impact,
      goalId: form.goalId || undefined,
      status: 'PENDING',
    };

    const res = await apiClient.createTask(payload);
    if (res.ok) {
      setForm({ title: '', effort: 120, impact: 40, goalId: '', deadline: '' });
      setShowForm(false);
      loadData();
    } else {
      setError(res.message || 'Could not create task.');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({ title: '', effort: 120, impact: 40, goalId: '', deadline: '' });
    setShowForm(false);
    setError(null);
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    console.log('handleStatusChange called:', { id, status });
    const res = await apiClient.updateTask(id, { status });
    console.log('updateTask response:', res);
    if (res.ok) {
      loadData();
    } else {
      console.error('Update failed:', res.message);
      setError(res.message || 'Update failed.');
    }
  };

  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'PENDING'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'DONE'), [tasks]);

  return (
    <div className="space-y-6">
      {/* Inbox Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
              <p className="text-sm text-gray-500">All tasks ({tasks.length} total)</p>
            </div>
          </div>
          
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          )}
        </div>

        {/* Task Creation Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="border border-gray-200 rounded-lg p-4 mb-6">
            {/* Task Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Task Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Write technical documentation"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Effort & Impact Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Effort</label>
                <select
                  value={form.effort}
                  onChange={(e) => setForm((f) => ({ ...f, effort: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {EFFORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Impact</label>
                <select
                  value={form.impact}
                  onChange={(e) => setForm((f) => ({ ...f, impact: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {IMPACT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Link to Goal */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Link to Goal (Optional)</label>
              <select
                value={form.goalId}
                onChange={(e) => setForm((f) => ({ ...f, goalId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">Deadline (Optional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">No tasks yet</p>
            <p className="text-sm text-gray-500">Click &quot;Add Task&quot; to create your first task</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <TaskRow key={task.id} task={task} goals={goals} onStatusChange={handleStatusChange} />
            ))}
            
            {completedTasks.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Completed ({completedTasks.length})</p>
                {completedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} goals={goals} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  goals,
  onStatusChange,
}: {
  task: Task;
  goals: GoalOption[];
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  const handleComplete = async () => {
    console.log('handleComplete clicked, task:', task.id, 'current status:', task.status);
    setUpdating(true);
    const newStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    console.log('Changing to status:', newStatus);
    await onStatusChange(task.id, newStatus);
    setUpdating(false);
  };

  const getEffortLabel = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    const option = EFFORT_OPTIONS.find(o => o.value === minutes);
    if (option) return option.label;
    if (minutes < 60) return `${minutes} min`;
    return `${Math.round(minutes / 60)} hours`;
  };

  const getImpactLabel = (impact: number | null | undefined) => {
    if (!impact) return null;
    const option = IMPACT_OPTIONS.find(o => o.value === impact);
    return option?.label || `${impact}/100`;
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${task.status === 'DONE' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={updating}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
            task.status === 'DONE'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {task.status === 'DONE' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.status === 'DONE' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
            {task.effort && <span>⏱️ {getEffortLabel(task.effort)}</span>}
            {task.impact && <span>📊 {getImpactLabel(task.impact)}</span>}
            {task.goalId && (
              <span className="text-blue-600">
                🎯 {goals.find((g) => g.id === task.goalId)?.title || 'Goal'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
