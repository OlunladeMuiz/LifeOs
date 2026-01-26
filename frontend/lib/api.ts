'use client';

import axios, { AxiosError } from 'axios';
import { logger } from './logger';
import type {
	AuthResponse,
	RefreshResponse,
	Goal,
	GoalsListResponse,
	CreateGoalRequest,
	UpdateGoalRequest,
	Task,
	TasksListResponse,
	CreateTaskRequest,
	UpdateTaskRequest,
	DailyContext,
	UpdateContextRequest,
	DecisionResponse,
} from './api-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Warn developers if API URL looks misconfigured
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	if (!process.env.NEXT_PUBLIC_API_URL) {
		logger.warn('NEXT_PUBLIC_API_URL not set, using default http://localhost:3001/api');
	}
}

// Timeout for all requests (10 seconds)
const REQUEST_TIMEOUT = 10000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type ApiErrorCode =
	| 'network_error'      // Backend unreachable / CORS / DNS failure
	| 'timeout_error'      // Request timed out
	| 'unauthorized'       // 401 - invalid/missing token
	| 'forbidden'          // 403 - no permission
	| 'not_found'          // 404
	| 'validation_error'   // 400 - bad input
	| 'server_error'       // 5xx
	| string;              // Backend-specific error codes

export interface ApiResponse<T> {
	ok: boolean;
	data?: T;
	error?: ApiErrorCode;
	message?: string;
}

class ApiClient {
	private accessToken: string | null = null;
	private refreshToken: string | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.accessToken = localStorage.getItem('accessToken');
			this.refreshToken = localStorage.getItem('refreshToken');
		}
	}

	setTokens(accessToken: string, refreshToken: string) {
		this.accessToken = accessToken;
		this.refreshToken = refreshToken;
		if (typeof window !== 'undefined') {
			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);
		}
	}

	clearTokens() {
		this.accessToken = null;
		this.refreshToken = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
		}
	}

	private getHeaders() {
		return {
			'Content-Type': 'application/json',
			...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
		};
	}

	// Classify error based on axios error and HTTP status
	private classifyError(error: AxiosError<unknown>): { code: ApiErrorCode; message: string } {
		// Network error - backend unreachable, CORS, DNS failure
		if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || !error.response) {
			return { code: 'network_error', message: 'Cannot reach the server. Is the backend running?' };
		}

		// Timeout
		if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
			return { code: 'timeout_error', message: 'Request timed out. Please try again.' };
		}

		const status = error.response.status;
		const payload = error.response.data;
		const backendError = isRecord(payload)
			? getString(payload.error) ?? getString(payload.message)
			: undefined;
		const backendMessage = isRecord(payload) ? getString(payload.message) : undefined;

		// HTTP status-based classification
		if (status === 401) {
			return { code: backendError || 'unauthorized', message: backendMessage || 'Authentication required.' };
		}
		if (status === 403) {
			return { code: 'forbidden', message: backendMessage || 'You do not have permission.' };
		}
		if (status === 404) {
			return { code: 'not_found', message: backendMessage || 'Resource not found.' };
		}
		if (status === 400 || status === 422) {
			return { code: backendError || 'validation_error', message: backendMessage || 'Invalid input.' };
		}
		if (status >= 500) {
			return { code: 'server_error', message: backendMessage || 'Server error. Please try again later.' };
		}

		// Fallback for other 4xx
		return { code: backendError || 'request_error', message: backendMessage || 'Request failed.' };
	}

	// Generic request helper with token refresh fallback
	async request<T>(
		method: HttpMethod,
		endpoint: string,
		data?: unknown,
		attemptedRefresh = false
	): Promise<ApiResponse<T>> {
		logger.api(method, endpoint, data ? { hasBody: true } : undefined);
		
		try {
			const url = `${API_URL}${endpoint}`;
			const response = await axios({
				method,
				url,
				data,
				headers: this.getHeaders(),
				timeout: REQUEST_TIMEOUT,
			});
			logger.debug(`API ${method} ${endpoint} succeeded`);
			return response.data;
		} catch (error: unknown) {
			const axiosError = error as AxiosError<unknown>;
			const status = axiosError.response?.status;

			// Attempt token refresh on 401
			if (status === 401 && this.refreshToken && !attemptedRefresh) {
				try {
					const refreshResponse = await axios.post<ApiResponse<RefreshResponse>>(
						`${API_URL}/auth/refresh`,
						{ refreshToken: this.refreshToken },
						{ timeout: REQUEST_TIMEOUT }
					);
					const accessToken = refreshResponse.data.data?.accessToken;
					if (!accessToken) {
						throw new Error('Invalid refresh response');
					}
					this.setTokens(accessToken, this.refreshToken);
					return this.request(method, endpoint, data, true);
				} catch (refreshErr: unknown) {
					this.clearTokens();
					const refreshError = this.classifyError(refreshErr as AxiosError<unknown>);
					return {
						ok: false,
						error: refreshError.code,
						message: 'Session expired. Please log in again.',
					};
				}
			}

			// Classify and return error
			const classified = this.classifyError(axiosError);
			logger.warn(`API ${method} ${endpoint} failed`, { 
				code: classified.code, 
				status: status,
				message: classified.message 
			});
			return {
				ok: false,
				error: classified.code,
				message: classified.message,
			};
		}
	}

	// Auth endpoints
	async register(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
		return this.request<AuthResponse>('POST', '/auth/register', { email, password });
	}

	async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
		return this.request<AuthResponse>('POST', '/auth/login', { email, password });
	}

	// Goals endpoints
	async getGoals(): Promise<ApiResponse<GoalsListResponse>> {
		return this.request<GoalsListResponse>('GET', '/goals');
	}

	async createGoal(title: string, description?: string, importance?: number): Promise<ApiResponse<Goal>> {
		const payload: CreateGoalRequest = { title, description, importance };
		return this.request<Goal>('POST', '/goals', payload);
	}

	async updateGoal(id: string, updates: UpdateGoalRequest): Promise<ApiResponse<Goal>> {
		return this.request<Goal>('PATCH', `/goals/${id}`, updates);
	}

	async deleteGoal(id: string): Promise<ApiResponse<void>> {
		return this.request<void>('DELETE', `/goals/${id}`);
	}

	// Tasks endpoints
	async getTasks(status?: string, goalId?: string): Promise<ApiResponse<TasksListResponse>> {
		const params = new URLSearchParams();
		if (status) params.append('status', status);
		if (goalId) params.append('goalId', goalId);
		const qs = params.toString();
		return this.request<TasksListResponse>('GET', qs ? `/tasks?${qs}` : '/tasks');
	}

	async createTask(data: CreateTaskRequest): Promise<ApiResponse<Task>> {
		return this.request<Task>('POST', '/tasks', data);
	}

	async updateTask(id: string, updates: UpdateTaskRequest): Promise<ApiResponse<Task>> {
		return this.request<Task>('PATCH', `/tasks/${id}`, updates);
	}

	async deleteTask(id: string): Promise<ApiResponse<void>> {
		return this.request<void>('DELETE', `/tasks/${id}`);
	}

	// Context endpoints
	async getContextToday(): Promise<ApiResponse<DailyContext>> {
		return this.request<DailyContext>('GET', '/context/today');
	}

	async updateContext(data: UpdateContextRequest): Promise<ApiResponse<DailyContext>> {
		return this.request<DailyContext>('POST', '/context', data);
	}

	// Decision endpoint
	async getNextTask(): Promise<ApiResponse<DecisionResponse>> {
		return this.request<DecisionResponse>('GET', '/decision/next');
	}
}

export const apiClient = new ApiClient();

