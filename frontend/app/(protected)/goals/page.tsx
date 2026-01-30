'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import type { Goal, UpdateGoalRequest } from '@/lib/api-types';

// Importance options matching Figma design
const IMPORTANCE_OPTIONS = [
  { value: 20, label: '1 - Low' },
  { value: 40, label: '2 - Below Average' },
  { value: 60, label: '3 - Medium' },
  { value: 80, label: '4 - High' },
  { value: 100, label: '5 - Critical' },
];

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    importance: 60, // Default: 3 - Medium
  });
  const [saving, setSaving] = useState(false);

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const inactiveGoals = goals.filter(g => g.status === 'INACTIVE');

  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.getGoals();
    if (res.ok && res.data) {
      setGoals(res.data.goals);
    } else {
      setError(res.message || 'Unable to load goals.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    setSaving(true);
    setError(null);
    const res = await apiClient.createGoal(form.title.trim(), undefined, form.importance);
    if (res.ok) {
      setForm({ title: '', importance: 60 });
      setShowForm(false);
      loadGoals();
    } else {
      setError(res.message || 'Could not create goal.');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({ title: '', importance: 60 });
    setShowForm(false);
    setError(null);
  };

  const handleUpdate = async (id: string, updates: Partial<Goal>) => {
    console.log('handleUpdate called:', { id, updates });
    const res = await apiClient.updateGoal(id, updates);
    console.log('updateGoal response:', res);
    if (res.ok) {
      loadGoals();
    } else {
      console.error('Goal update failed:', res.message);
      setError(res.message || 'Update failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Goals Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <circle cx="12" cy="12" r="6" strokeWidth={2} />
              <circle cx="12" cy="12" r="2" strokeWidth={2} />
            </svg>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Goals</h1>
              <p className="text-sm text-gray-500">Maximum 3 active goals (depth over breadth)</p>
            </div>
          </div>
          
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              disabled={activeGoals.length >= 3}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={activeGoals.length >= 3 ? 'Maximum 3 active goals allowed' : 'Add a new goal'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Goal
            </button>
          )}
        </div>

        {/* Goal Creation Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="border border-gray-200 rounded-lg p-4 mb-6">
            {/* Goal Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Goal Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Launch new product feature"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Importance */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">Importance</label>
              <select
                value={form.importance}
                onChange={(e) => setForm((f) => ({ ...f, importance: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {IMPORTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
                {saving ? 'Creating...' : 'Create Goal'}
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

        {/* Goals List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No active goals. Add your first goal to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdate} />
                ))}
              </div>
            )}

            {/* Inactive Goals */}
            {inactiveGoals.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Inactive ({inactiveGoals.length})</p>
                <div className="space-y-3">
                  {inactiveGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: (id: string, updates: UpdateGoalRequest) => Promise<void> }) {
  const [toggling, setToggling] = useState(false);

  const toggleStatus = async () => {
    console.log('toggleStatus clicked, goal:', goal.id, 'current status:', goal.status);
    setToggling(true);
    const newStatus = goal.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    console.log('Changing goal to status:', newStatus);
    await onUpdate(goal.id, { status: newStatus });
    setToggling(false);
  };

  const getImportanceLabel = (importance: number) => {
    const option = IMPORTANCE_OPTIONS.find(o => o.value === importance);
    return option?.label || `${importance}/100`;
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${goal.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-base font-medium ${goal.status === 'INACTIVE' ? 'text-gray-500' : 'text-gray-900'}`}>
              {goal.title}
            </h3>
            {goal.status === 'ACTIVE' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                Active
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>📊 Importance: {getImportanceLabel(goal.importance)}</span>
            {goal.taskCount !== undefined && goal.taskCount > 0 && (
              <span>📋 {goal.taskCount} task{goal.taskCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        
        <button
          type="button"
          onClick={toggleStatus}
          disabled={toggling}
          className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
            goal.status === 'ACTIVE'
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border-blue-300 text-blue-700 hover:bg-blue-50'
          }`}
        >
          {toggling ? 'Updating...' : goal.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
