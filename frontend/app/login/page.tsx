'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, mapAuthError } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { login, register, user, isLoading: authLoading, backendOnline } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, mounted, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-submit
    
    // Check backend before attempting auth
    if (!backendOnline) {
      setError('Cannot reach the server. Is the backend running?');
      return;
    }

    setLoading(true);
    setError('');

    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const { success, error: authError } = isRegister
        ? await register(email, password)
        : await login(email, password);

      if (success) {
        router.push('/');
      } else {
        setError(mapAuthError(authError, isRegister));
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      logger.error('Auth submission failed', err, { isRegister });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth provider initializes
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-semibold mb-2 text-center text-gray-900">LifeOS</h1>
        <p className="text-gray-600 text-center mb-12">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed p-1 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m7.538-1.897a3.375 3.375 0 001-2.75A3.375 3.375 0 0012 5.25c-4.478 0-8.268 2.943-9.543 7a10.066 10.066 0 002.82 5.155m7.533-2.334A10.047 10.047 0 0112 12.75c4.478 0 8.268 2.943 9.543 7a9.968 9.968 0 01-1.921 4.33m-10.513 6.926A10.048 10.048 0 0112 19c4.478 0 8.268 2.943 9.543 7M3 3l18 18"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Loading...'
              : isRegister
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">
            {isRegister
              ? 'Already have an account?'
              : "Don't have an account?"}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return;
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-blue-600 font-medium hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
}
