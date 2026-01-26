'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './api';
import type { AuthResponse, User } from './api-types';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  backendOnline: boolean;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'offline';

export const mapAuthError = (error: string | undefined, isRegister: boolean) => {
  if (!error) return isRegister ? 'Failed to register. Please try again.' : 'Invalid email or password.';

  switch (error) {
    // Auth-specific errors
    case 'email_already_exists':
      return 'That email is already registered. Try signing in instead.';
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'validation_error':
      return 'Use a valid email and a password with at least 8 characters.';
    case 'missing_token':
    case 'invalid_token':
    case 'unauthorized':
      return 'Session expired. Please sign in again.';
    
    // Connectivity errors
    case 'network_error':
      return 'Cannot reach the server. Is the backend running?';
    case 'timeout_error':
      return 'Request timed out. Please check your connection and try again.';
    case 'server_error':
      return 'Server error. Please try again later.';
    
    // Permission errors
    case 'forbidden':
      return 'You do not have permission to perform this action.';
    case 'not_found':
      return 'The requested resource was not found.';
    
    default:
      return isRegister
        ? 'Failed to register. Please check your email or try again.'
        : 'Invalid email or password.';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<{ user: User | null; status: AuthStatus }>(
    { user: null, status: 'loading' }
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // One-time health probe to fail fast if backend is offline
      const health = await apiClient.request<unknown>('GET', '/health');
      if (!health.ok) {
        if (cancelled) return;
        setState({ user: null, status: 'offline' });
        return;
      }

      // No stored session: unauthenticated
      if (!accessToken || !refreshToken) {
        if (cancelled) return;
        setState({ user: null, status: 'unauthenticated' });
        return;
      }

      // Have tokens: set them, then validate via refresh before trusting user
      apiClient.setTokens(accessToken, refreshToken);
      let parsedUser: User | null = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser) as User;
        } catch {
          // Corrupted localStorage, clear it
          localStorage.removeItem('user');
          parsedUser = null;
        }
      }

      const refresh = await apiClient.request<{ accessToken: string }>(
        'POST',
        '/auth/refresh',
        { refreshToken }
      );

      if (refresh.ok && refresh.data) {
        const newAccess = refresh.data.accessToken;
        apiClient.setTokens(newAccess, refreshToken);
        if (!cancelled) {
          setState({ user: parsedUser, status: 'authenticated' });
        }
      } else {
        apiClient.clearTokens();
        localStorage.removeItem('user');
        if (!cancelled) {
          setState({ user: null, status: 'unauthenticated' });
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const response = await apiClient.login(email, password);
    if (response.ok && response.data) {
      const { user: userData, accessToken, refreshToken } = response.data as AuthResponse;
      apiClient.setTokens(accessToken, refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setState({ user: userData, status: 'authenticated' });
      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const register = async (email: string, password: string): Promise<AuthResult> => {
    const response = await apiClient.register(email, password);
    if (response.ok && response.data) {
      const { user: userData, accessToken, refreshToken } = response.data as AuthResponse;
      apiClient.setTokens(accessToken, refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setState({ user: userData, status: 'authenticated' });
      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const logout = () => {
    apiClient.clearTokens();
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, status: 'unauthenticated' });
  };

  const isLoading = state.status === 'loading';
  const backendOnline = state.status !== 'offline';

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isLoading,
        backendOnline,
        status: state.status,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
