'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import type { Recommendation, DecisionInputs } from '@/lib/api-types';

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface DailyFocusState {
  status: Status;
  recommendation: Recommendation | null;
  inputs: DecisionInputs | null;
  error: string | null;
  isComputing: boolean;
  info?: string | null;
}

interface QuickStartStep {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}

export const DailyFocus: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<DailyFocusState>({
    status: 'idle',
    recommendation: null,
    inputs: null,
    error: null,
    isComputing: false,
    info: null,
  });

  // Quick start steps - in a real app, these would be computed from actual data
  const [quickStartSteps] = useState<QuickStartStep[]>([
    {
      number: 1,
      title: 'Set Daily Context',
      description: 'Tell LifeOS your available hours and energy level',
      completed: false,
    },
    {
      number: 2,
      title: 'Define Goals',
      description: 'Create 1-3 active goals to guide prioritization',
      completed: false,
    },
    {
      number: 3,
      title: 'Add Tasks',
      description: 'Input tasks with effort, impact, and optional deadlines',
      completed: false,
    },
    {
      number: 4,
      title: 'Compute Priorities',
      description: 'Click "Compute Priorities" to run the decision engine',
      completed: false,
    },
  ]);

  const loadRecommendation = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'You need to log in to see your priorities.',
        recommendation: null,
        inputs: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
      recommendation: null,
      inputs: null,
      isComputing: false,
      info: null,
    }));

    try {
      const response = await apiClient.getNextTask();

      if (!response.ok) {
        throw new Error(response.error || 'Unable to load your priorities right now.');
      }

      const recommendation = response.data?.recommendation ?? null;
      const message = response.data?.message ?? null;
      const inputs = response.data?.inputs ?? null;

      if (recommendation && recommendation.taskId) {
        setState((prev) => ({
          ...prev,
          status: 'success',
          recommendation,
          inputs,
          error: null,
          info: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: 'empty',
          recommendation: null,
          inputs,
          error: message ?? null,
          info: message,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network issue. Please try again.';
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
        recommendation: null,
        inputs: null,
        isComputing: false,
        info: null,
      }));
    }
  }, [user]);

  const handleComputePriorities = useCallback(async () => {
    setState((prev) => ({ ...prev, isComputing: true }));
    await loadRecommendation();
    setState((prev) => ({ ...prev, isComputing: false }));
  }, [loadRecommendation]);

  useEffect(() => {
    if (!authLoading) {
      loadRecommendation();
    }
  }, [authLoading, loadRecommendation]);

  const showQuickStart = state.status === 'empty' || state.status === 'idle';

  return (
    <div className="space-y-6">
      {/* Quick Start Guide - Show when no priorities */}
      {showQuickStart && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Quick Start Guide</h2>
          <p className="text-sm text-gray-600 mb-6">Complete these steps to start using LifeOS</p>
          
          <div className="space-y-4">
            {quickStartSteps.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? '✓' : step.number}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Focus Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Daily Focus</h2>
            <p className="text-sm text-gray-600">Your top priority for today</p>
          </div>

          <button
            type="button"
            onClick={handleComputePriorities}
            disabled={state.status === 'loading' || state.isComputing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {state.isComputing ? 'Computing…' : 'Compute'}
          </button>
        </div>

        {/* Loading State */}
        {state.status === 'loading' && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {state.status === 'empty' && <EmptyState />}

        {/* Error State */}
        {state.status === 'error' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">Unable to load priorities</h3>
            <p className="text-sm text-gray-600 mb-4">{state.error}</p>
            <button
              onClick={loadRecommendation}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success State - Show recommendation */}
        {state.status === 'success' && state.recommendation && (
          <TaskCard recommendation={state.recommendation} onRefresh={loadRecommendation} />
        )}
      </div>
    </div>
  );
};

function EmptyState() {
  return (
    <div className="text-center py-12">
      {/* Circle with exclamation icon */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Priorities Yet</h3>
      <p className="text-sm text-gray-600 mb-6">
        Follow the Quick Start guide above, then click &quot;Compute Priorities&quot;
      </p>

      {/* Info box */}
      <div className="inline-block bg-gray-50 rounded-lg p-4 text-left max-w-md">
        <p className="text-sm font-medium text-gray-900 mb-3">LifeOS reduces cognitive load by:</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-gray-400 mt-1">•</span>
            <span>Analyzing urgency, impact, and effort</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-gray-400 mt-1">•</span>
            <span>Respecting your available time and energy</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-gray-400 mt-1">•</span>
            <span>Aligning tasks to your active goals</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-gray-400 mt-1">•</span>
            <span>Explaining every decision it makes</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

interface TaskCardProps {
  recommendation: Recommendation;
  onRefresh: () => void;
}

function TaskCard({ recommendation, onRefresh }: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const response = await apiClient.updateTask(recommendation.taskId, { status: 'DONE' });
      if (response.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {recommendation.goalTitle && (
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              {recommendation.goalTitle}
            </p>
          )}
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {recommendation.taskTitle}
          </h3>
          {recommendation.taskDescription && (
            <p className="text-sm text-gray-600 mb-2">{recommendation.taskDescription}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {recommendation.effort && <span>⏱️ {recommendation.effort} min</span>}
            {recommendation.impact && <span>📊 Impact: {recommendation.impact}/100</span>}
          </div>
        </div>
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-shrink-0 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isCompleting ? 'Completing...' : 'Complete'}
        </button>
      </div>
      {recommendation.reasoning && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">{recommendation.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default DailyFocus;
