'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';

/**
 * LifeOS Today Screen
 * 
 * A calm, focused interface for viewing your single recommended task.
 * Emphasizes clarity, typography, and minimal interaction.
 * 
 * States:
 * - Loading: Subtle spinner, warm message
 * - Error: Clear recovery path
 * - Empty: Encouraging message with next steps
 * - Recommendation: Large typography, single task focus
 */

interface Recommendation {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  goalTitle?: string;
  effort?: number;
  impact?: number;
  reasoning: string;
}

interface TodayScreenState {
  status: 'loading' | 'error' | 'empty' | 'success';
  recommendation: Recommendation | null;
  error: string | null;
  isStarting: boolean;
  isSkipping: boolean;
}

export const TodayScreen: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<TodayScreenState>({
    status: 'loading',
    recommendation: null,
    error: null,
    isStarting: false,
    isSkipping: false,
  });

  // Load recommendation on mount or when user changes
  useEffect(() => {
    if (!authLoading && user) {
      loadRecommendation();
    } else if (!authLoading && !user) {
      setState({
        status: 'error',
        recommendation: null,
        error: 'Not authenticated. Please log in.',
        isStarting: false,
        isSkipping: false,
      });
    }
  }, [user, authLoading]);

  const loadRecommendation = async () => {
    setState({
      status: 'loading',
      recommendation: null,
      error: null,
      isStarting: false,
      isSkipping: false,
    });

    try {
      console.log('[TodayScreen] Fetching recommendation for user:', user?.id);
      const response = await apiClient.getNextTask();
      
      console.log('[TodayScreen] API response:', response);
      
      if (response.ok && response.data) {
        const recommendation = (response.data as any)?.recommendation;
        
        if (recommendation && recommendation.taskId) {
          setState({
            status: 'success',
            recommendation,
            error: null,
            isStarting: false,
            isSkipping: false,
          });
        } else {
          // No tasks available
          setState({
            status: 'empty',
            recommendation: null,
            error: null,
            isStarting: false,
            isSkipping: false,
          });
        }
      } else {
        // API error
        const errorMsg = (response.data as any)?.message || (response as any)?.error || 'Failed to load recommendation';
        console.log('[TodayScreen] API error:', errorMsg);
        
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.log('[TodayScreen] Catch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load your task';
      
      setState({
        status: 'error',
        recommendation: null,
        error: errorMessage,
        isStarting: false,
        isSkipping: false,
      });
    }
  };

  const handleStartTask = async () => {
    if (!state.recommendation) return;

    setState((prev) => ({ ...prev, isStarting: true }));

    try {
      const response = await apiClient.updateTask(state.recommendation.taskId, {
        status: 'DONE',
      });

      if (response.ok) {
        // Brief success delay, then reload
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadRecommendation();
      } else {
        setState((prev) => ({
          ...prev,
          error: 'Could not start task. Please try again.',
          isStarting: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Network error. Please try again.',
        isStarting: false,
      }));
    }
  };

  const handleSnoozeTask = async () => {
    if (!state.recommendation) return;

    setState((prev) => ({ ...prev, isSkipping: true }));

    try {
      const response = await apiClient.updateTask(state.recommendation.taskId, {
        status: 'SNOOZED',
      });

      if (response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await loadRecommendation();
      } else {
        setState((prev) => ({
          ...prev,
          error: 'Could not snooze task. Please try again.',
          isSkipping: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Network error. Please try again.',
        isSkipping: false,
      }));
    }
  };

  // Show loading while auth context is initializing
  if (authLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* LOADING STATE */}
      {state.status === 'loading' && <LoadingState />}

      {/* ERROR STATE */}
      {state.status === 'error' && (
        <ErrorState error={state.error} onRetry={loadRecommendation} />
      )}

      {/* EMPTY STATE */}
      {state.status === 'empty' && <EmptyState />}

      {/* SUCCESS STATE */}
      {state.status === 'success' && state.recommendation && (
        <SuccessState
          recommendation={state.recommendation}
          onStart={handleStartTask}
          onSnooze={handleSnoozeTask}
          isStarting={state.isStarting}
          isSkipping={state.isSkipping}
          error={state.error}
        />
      )}
    </div>
  );
};

/**
 * LOADING STATE
 * Calm spinner with subtle messaging
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-700 rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <p className="text-base text-gray-600 font-light tracking-wide">
          Finding your next task…
        </p>
      </div>
    </div>
  );
}

/**
 * ERROR STATE
 * Clear error with recovery action
 */
interface ErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  // Map technical errors to user-friendly messages
  const getUserMessage = (error: string | null): string => {
    if (!error) return 'Unable to load your task. Please try again.';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('no active goals') || errorLower.includes('not found')) {
      return 'Create a goal and add tasks to get started.';
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return 'Check your internet connection and try again.';
    }
    if (errorLower.includes('unauthorized') || errorLower.includes('authenticated')) {
      return 'Your session expired. Please log in again.';
    }
    
    return error;
  };

  const userMessage = getUserMessage(error);

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
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

        {/* Heading */}
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          Unable to load your task
        </h2>

        {/* Error Message */}
        <p className="mb-8 text-base text-gray-600 font-light leading-relaxed">
          {userMessage}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/goals"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-900 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Create a Goal
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * EMPTY STATE
 * Encouraging message when no tasks available
 */
function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
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

        {/* Heading */}
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          No tasks today
        </h2>

        {/* Message */}
        <p className="mb-8 text-base text-gray-600 font-light leading-relaxed">
          You've completed everything or haven't added tasks yet. Create a goal to get started.
        </p>

        {/* Button */}
        <a
          href="/goals"
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Go to Goals
        </a>
      </div>
    </div>
  );
}

/**
 * SUCCESS STATE
 * Display single recommended task with large, clear typography
 */
interface SuccessStateProps {
  recommendation: Recommendation;
  onStart: () => Promise<void>;
  onSnooze: () => Promise<void>;
  isStarting: boolean;
  isSkipping: boolean;
  error: string | null;
}

function SuccessState({
  recommendation,
  onStart,
  onSnooze,
  isStarting,
  isSkipping,
  error,
}: SuccessStateProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top spacing */}
      <div className="flex-1" />

      {/* Main content */}
      <div className="px-6 pb-20">
        <div className="w-full max-w-2xl mx-auto">
          {/* Goal context (small, subtle) */}
          {recommendation.goalTitle && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest font-medium text-gray-500">
                {recommendation.goalTitle}
              </p>
            </div>
          )}

          {/* Task title (large, editorial) */}
          <h1 className="mb-6 text-5xl md:text-6xl font-light leading-tight text-gray-900">
            {recommendation.taskTitle}
          </h1>

          {/* Task description (if present) */}
          {recommendation.taskDescription && (
            <p className="mb-8 text-lg md:text-xl font-light text-gray-700 leading-relaxed max-w-xl">
              {recommendation.taskDescription}
            </p>
          )}

          {/* Effort/Impact metrics (subtle) */}
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

          {/* Reasoning box (subtle background) */}
          <div className="mb-12 p-6 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-700 font-light leading-relaxed">
              {recommendation.reasoning}
            </p>
          </div>

          {/* Error message (if any) */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 font-light">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Start button (primary) */}
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

            {/* Snooze button (secondary) */}
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

          {/* Context link (minimal) */}
          <p className="mt-8 text-center text-xs text-gray-500 font-light">
            <a href="/context" className="hover:text-gray-700 transition-colors">
              Update your energy or available time
            </a>
          </p>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="flex-1" />
    </div>
  );
}
