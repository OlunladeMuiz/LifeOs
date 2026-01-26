/**
 * Shared API contract types for frontend-backend communication.
 * These types mirror the backend response shapes exactly.
 */

// =============================================================================
// Common Types
// =============================================================================

export type GoalStatus = 'ACTIVE' | 'INACTIVE';
export type TaskStatus = 'PENDING' | 'DONE' | 'SNOOZED';
export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// =============================================================================
// User & Auth
// =============================================================================

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// =============================================================================
// Goals
// =============================================================================

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: GoalStatus;
  importance: number;
  createdAt?: string;
  taskCount?: number;
}

export interface GoalsListResponse {
  goals: Goal[];
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  importance?: number;
}

export interface UpdateGoalRequest {
  title?: string;
  importance?: number;
  status?: GoalStatus;
}

// =============================================================================
// Tasks
// =============================================================================

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  effort?: number | null;
  impact?: number | null;
  goalId?: string | null;
  goal?: { title: string } | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface TasksListResponse {
  tasks: Task[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  effort?: number;
  impact?: number;
  goalId?: string;
  status?: TaskStatus;
}

export interface UpdateTaskRequest {
  title?: string;
  effort?: number;
  impact?: number;
  status?: TaskStatus;
  goalId?: string;
}

// =============================================================================
// Daily Context
// =============================================================================

export interface DailyContext {
  date: string;
  energyLevel: EnergyLevel | null;
  availableMinutes: number | null;
  stressLevel?: number | null;
}

export interface UpdateContextRequest {
  date: string;
  energyLevel: EnergyLevel;
  availableMinutes: number;
  stressLevel?: number;
}

// =============================================================================
// Decision Engine
// =============================================================================

export interface DecisionContext {
  date: string;
  energyLevel: string;
  availableMinutes: number;
  stressLevel: number;
  contextSet: boolean;
}

export interface DecisionInputs {
  context: DecisionContext;
  activeGoalCount: number;
  totalPendingTasks: number;
  goalTaskCounts: Record<string, number>;
}

export interface Recommendation {
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  goalTitle?: string | null;
  goalImportance?: number | null;
  effort?: number | null;
  impact?: number | null;
  reasoning: string;
}

export interface DecisionResponse {
  recommendation: Recommendation | null;
  message?: string;
  inputs?: DecisionInputs;
}
