'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import type { Recommendation, DecisionInputs } from '@/lib/api-types';

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface TodayState {
  status: Status;
  recommendation: Recommendation | null;
  inputs: DecisionInputs | null;
  error: string | null;
  isStarting: boolean;
  isSkipping: boolean;
  info?: string | null;
}

export const TodayScreen: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<TodayState>({
    status: 'idle',
    recommendation: null,
    inputs: null,
    error: null,
    isStarting: false,
    isSkipping: false,
    info: null,
  });

  const loadRecommendation = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'You need to log in to see your task.',
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
      isStarting: false,
      isSkipping: false,
      info: null,
    }));

    try {
      const response = await apiClient.getNextTask();

      if (!response.ok) {
        throw new Error(response.error || 'Unable to load your task right now.');
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
        isStarting: false,
        isSkipping: false,
        info: null,
      }));
    }
  }, [user]);

  const handleStartTask = useCallback(async () => {
    if (!state.recommendation) return;

    setState((prev) => ({ ...prev, isStarting: true, error: null }));
    try {
      const response = await apiClient.updateTask(state.recommendation.taskId, {
        status: 'DONE',
      });

      if (!response.ok) {
        throw new Error(response.error || 'Could not start task.');
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadRecommendation();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isStarting: false,
        error: err instanceof Error ? err.message : 'Network issue. Please try again.',
      }));
    }
  }, [state.recommendation, loadRecommendation]);

  const handleSnoozeTask = useCallback(async () => {
    if (!state.recommendation) return;

    setState((prev) => ({ ...prev, isSkipping: true, error: null }));
    try {
      const response = await apiClient.updateTask(state.recommendation.taskId, {
        status: 'SNOOZED',
      });

      if (!response.ok) {
        throw new Error(response.error || 'Could not snooze task.');
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadRecommendation();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSkipping: false,
        error: err instanceof Error ? err.message : 'Network issue. Please try again.',
      }));
    }
  }, [state.recommendation, loadRecommendation]);

  useEffect(() => {
    if (!authLoading) {
      loadRecommendation();
    }
  }, [authLoading, loadRecommendation]);

  if (authLoading || state.status === 'idle') {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <ErrorState
        error="You are not logged in."
        onRetry={loadRecommendation}
        actionLabel="Go to Login"
        actionHref="/login"
      />
    );
  }

  if (state.status === 'loading') return <LoadingState />;

  if (state.status === 'error') {
    return (
      <ErrorState
        error={state.error || 'Unable to load your task.'}
        onRetry={loadRecommendation}
      />
    );
  }

  if (state.status === 'empty') {
    return <EmptyState message={state.info} inputs={state.inputs} />;
  }

  return (
    <SuccessState
      recommendation={state.recommendation!}
      inputs={state.inputs}
      onStart={handleStartTask}
      onSnooze={handleSnoozeTask}
      isStarting={state.isStarting}
      isSkipping={state.isSkipping}
      error={state.error}
    />
  );
};

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
        </div>
        <p className="text-base text-gray-600 font-light tracking-wide">
          Finding your next task…
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  actionLabel,
  actionHref,
}: {
  error: string;
  onRetry: () => void;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          Unable to load your task
        </h2>
        <p className="mb-8 text-base text-gray-600 font-light leading-relaxed">
          {error}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
          {actionHref && (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-900 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, inputs }: { message?: string | null; inputs?: DecisionInputs | null }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        </div>
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          No tasks today
        </h2>
<p className="mb-6 text-base text-gray-600 font-light leading-relaxed">
          {message || "You've completed everything or haven't added tasks yet. Create a goal to get started."}
        </p>
        
        {inputs && (
          <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200 text-left">
            <p className="text-xs uppercase tracking-widest font-medium text-gray-500 mb-2">Current Context</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>⏱️ {inputs.context.availableMinutes} min available</p>
              <p>⚡ {inputs.context.energyLevel} energy</p>
              <p>🎯 {inputs.activeGoalCount} active goal{inputs.activeGoalCount !== 1 ? 's' : ''}</p>
              <p>📋 {inputs.totalPendingTasks} pending task{inputs.totalPendingTasks !== 1 ? 's' : ''}</p>
              {!inputs.context.contextSet && (
                <p className="text-amber-600 mt-2">⚠️ Using default context. <Link href="/context" className="underline">Set your context</Link></p>
              )}
            </div>
          </div>
        )}

        <Link
          href="/goals"
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Go to Goals
        </Link>
      </div>
    </div>
  );
}

function SuccessState({
  recommendation,
  onStart,
  onSnooze,
  isStarting,
  isSkipping,
  error,
  inputs,
}: {
  recommendation: Recommendation;
  onStart: () => Promise<void>;
  onSnooze: () => Promise<void>;
  isStarting: boolean;
  isSkipping: boolean;
  error: string | null;
  inputs?: DecisionInputs | null;
}) {
  const [showInputs, setShowInputs] = React.useState(false);
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1" />
      <div className="px-6 pb-20">
        <div className="w-full max-w-2xl mx-auto">
          {recommendation.goalTitle && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest font-medium text-gray-500">
                {recommendation.goalTitle}
              </p>
            </div>
          )}
          <h1 className="mb-6 text-5xl md:text-6xl font-light leading-tight text-gray-900">
            {recommendation.taskTitle}
          </h1>
          {recommendation.taskDescription && (
            <p className="mb-8 text-lg md:text-xl font-light text-gray-700 leading-relaxed max-w-xl">
              {recommendation.taskDescription}
            </p>
          )}
          {(recommendation.effort || recommendation.impact) && (
            <div className="mb-10 flex gap-6 text-sm text-gray-600">
              {recommendation.effort && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-medium text-gray-500 mb-1">
                    Effort
                  </p>
                  <p className="text-base font-light text-gray-900">
                    {recommendation.effort} min
                  </p>
                </div>
              )}
              {recommendation.impact && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-medium text-gray-500 mb-1">
                    Impact
                  </p>
                  <p className="text-base font-light text-gray-900">
                    {recommendation.impact}/100
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="mb-12 p-6 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-700 font-light leading-relaxed">
              {recommendation.reasoning}
            </p>
            
            {inputs && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInputs(!showInputs)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {showInputs ? '▼' : '▶'} Decision Inputs
                </button>
                {showInputs && (
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <p>⏱️ {inputs.context.availableMinutes} min available</p>
                    <p>⚡ {inputs.context.energyLevel} energy | 😰 {inputs.context.stressLevel} stress</p>
                    <p>🎯 {inputs.activeGoalCount} active goal{inputs.activeGoalCount !== 1 ? 's' : ''} | 📋 {inputs.totalPendingTasks} pending tasks</p>
                    {recommendation.goalImportance && (
                      <p>⭐ Goal importance: {recommendation.goalImportance}</p>
                    )}
                    {!inputs.context.contextSet && (
                      <p className="text-amber-600 mt-2">⚠️ Using default context. <Link href="/context" className="underline">Set your context</Link></p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 font-light">{error}</p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onStart}
              disabled={isStarting}
              className="flex-1 px-6 py-4 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStarting ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting…
                </span>
              ) : (
                'Start Task'
              )}
            </button>
            <button
              onClick={onSnooze}
              disabled={isSkipping}
              className="px-6 py-4 border border-gray-300 text-gray-900 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSkipping ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  Snoozing…
                </span>
              ) : (
                'Snooze'
              )}
            </button>
          </div>
          <p className="mt-8 text-center text-xs text-gray-500 font-light">
            <Link href="/context" className="hover:text-gray-700 transition-colors">
              Update your energy or available time
            </Link>
          </p>
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}
