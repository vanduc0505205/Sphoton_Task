export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface SafeUserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOwnerDto {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface TaskDto {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  user?: TaskOwnerDto;
}

export interface TaskStatsDto {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  todo: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
