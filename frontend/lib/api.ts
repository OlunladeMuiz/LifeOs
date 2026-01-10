'use client';

import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      console.log('[ApiClient] Initialized with tokens:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
      });
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      console.log('[ApiClient] Tokens set successfully');
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      console.log('[ApiClient] Tokens cleared');
    }
  }

  private getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };
    console.log('[ApiClient] Headers:', { hasAuth: !!this.accessToken });
    return headers;
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_URL}${endpoint}`;
      console.log(`[API] ${method} ${url}`, data ? { data } : '');
      
      const response = await axios({
        method,
        url,
        data,
        headers: this.getHeaders(),
      });
      
      console.log(`[API] Response OK:`, response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as any;
      console.log(`[API] Error:`, axiosError.response?.status, axiosError.response?.data);
      
      if (axios.isAxiosError(axiosError) && axiosError.response?.status === 401) {
        // Token expired, try refresh
        if (this.refreshToken) {
          try {
            const refreshResponse = await axios.post(
              `${API_URL}/auth/refresh`,
              { refreshToken: this.refreshToken }
            );
            const { accessToken } = refreshResponse.data.data;
            this.setTokens(accessToken, this.refreshToken);
            // Retry original request
            return this.request(method, endpoint, data);
          } catch {
            this.clearTokens();
          }
        }
      }
      return {
        ok: false,
        error: axios.isAxiosError(axiosError)
          ? axiosError.response?.data?.error || 'network_error'
          : 'unknown_error',
      };
    }
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.request('POST', '/auth/register', { email, password });
  }

  async login(email: string, password: string) {
    return this.request('POST', '/auth/login', { email, password });
  }

  // Goals endpoints
  async getGoals() {
    return this.request('GET', '/goals');
  }

  async createGoal(title: string, description?: string, priority?: number) {
    return this.request('POST', '/goals', { title, description, priority });
  }

  async updateGoal(id: string, updates: any) {
    return this.request('PATCH', `/goals/${id}`, updates);
  }

  async deleteGoal(id: string) {
    return this.request('DELETE', `/goals/${id}`);
  }

  // Tasks endpoints
  async getTasks(status?: string, goalId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (goalId) params.append('goalId', goalId);
    return this.request('GET', `/tasks?${params}`);
  }

  async createTask(data: any) {
    return this.request('POST', '/tasks', data);
  }

  async updateTask(id: string, updates: any) {
    return this.request('PATCH', `/tasks/${id}`, updates);
  }

  async deleteTask(id: string) {
    return this.request('DELETE', `/tasks/${id}`);
  }

  // Context endpoints
  async getContextToday() {
    return this.request('GET', '/context/today');
  }

  async updateContext(data: any) {
    return this.request('POST', '/context', data);
  }

  // Decision endpoint
  async getNextTask() {
    return this.request('GET', '/decision/next');
  }
}

export const apiClient = new ApiClient();
