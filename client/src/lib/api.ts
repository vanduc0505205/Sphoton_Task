import {
  AdminUserStatusFilter,
  ApiResponse,
  AuthUserData,
  PaginatedResult,
  TaskDto,
  TaskItemData,
  TaskPriority,
  TaskStatsData,
  TaskStatus,
  UserDto,
  UserRole,
} from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL)
  : 'http://localhost:4000/api';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  allowRefresh: boolean = true
): Promise<ApiResponse<T>> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/register') &&
    !endpoint.startsWith('/auth/refresh')
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(endpoint, options, false);
    }
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    throw new ApiClientError(json.message, response.status, json.errors);
  }

  return json;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export const authApi = {
  register: (payload: { fullName: string; email: string; password: string }) =>
    request<AuthUserData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyEmail: (token: string) =>
    request<AuthUserData>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<null>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (payload: { email: string; password: string; rememberMe: boolean }) =>
    request<AuthUserData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<null>('/auth/logout', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    request<null>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { token: string; password: string }) =>
    request<null>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<AuthUserData>('/auth/me', { method: 'GET' }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<null>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export interface TaskFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy?: 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpsertTaskPayload {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
}

export const taskApi = {
  getMyTasks: (params: TaskFilterParams) =>
    request<PaginatedResult<TaskDto>>(
      `/tasks${buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
        priority: params.priority,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })}`
    ),

  getStats: () => request<TaskStatsData>('/tasks/stats'),

  getTaskById: (taskId: string) => request<TaskItemData>(`/tasks/${taskId}`),

  createTask: (payload: UpsertTaskPayload) =>
    request<TaskItemData>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (taskId: string, payload: Partial<UpsertTaskPayload>) =>
    request<TaskItemData>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteTask: (taskId: string) =>
    request<null>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};

export const profileApi = {
  updateProfile: (payload: { fullName: string }) =>
    request<AuthUserData>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<AuthUserData>('/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  },
};

export interface AdminUserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: AdminUserStatusFilter;
}

export const adminApi = {
  getUsers: (params: AdminUserFilterParams) =>
    request<PaginatedResult<UserDto>>(
      `/admin/users${buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search,
        role: params.role,
        status: params.status,
      })}`
    ),

  changeUserRole: (userId: string, role: UserRole) =>
    request<AuthUserData>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  toggleUserLock: (userId: string, isLocked: boolean) =>
    request<AuthUserData>(`/admin/users/${userId}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ isLocked }),
    }),

  deleteUser: (userId: string) =>
    request<null>(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  getAllTasks: (params: TaskFilterParams) =>
    request<PaginatedResult<TaskDto>>(
      `/admin/tasks${buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
        priority: params.priority,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })}`
    ),
};
