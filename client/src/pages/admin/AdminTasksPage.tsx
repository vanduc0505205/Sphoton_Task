import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminApi, ApiClientError, taskApi, UpsertTaskPayload } from '../../lib/api';
import { TaskDto, TaskPriority, TaskStatus } from '../../types/api.types';
import { cn, formatDate, isTaskOverdue } from '../../lib/utils';
import { TaskPriorityBadge, TaskStatusBadge } from '../../components/ui/Badges';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States';
import {
  DeleteTaskConfirmModal,
  TaskFormModal,
} from '../../components/tasks/TaskDialogs';

export function AdminTasksPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState<number>(1);

  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const allTasksQuery = useQuery({
    queryKey: [
      'admin',
      'tasks',
      {
        page,
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
      },
    ],
    queryFn: async () => {
      const res = await adminApi.getAllTasks({
        page,
        limit: 10,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: statusFilter !== '' ? statusFilter : undefined,
        priority: priorityFilter !== '' ? priorityFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpsertTaskPayload) => {
      if (!editingTask) {
        throw new Error('No task selected');
      }
      return taskApi.updateTask(editingTask.id, payload);
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      showToast({
        title: 'Đã cập nhật công việc',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể cập nhật';
      showToast({
        title: 'Lỗi cập nhật',
        description: msg,
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.deleteTask(taskId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeletingTask(null);
      showToast({
        title: 'Đã xóa công việc',
        description: res.message,
        variant: 'info',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể xóa công việc';
      showToast({
        title: 'Lỗi xóa công việc',
        description: msg,
        variant: 'error',
      });
    },
  });

  if (!currentUser) {
    return null;
  }

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Toàn bộ công việc hệ thống
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isSuperAdmin
            ? 'Giám sát, chỉnh sửa hoặc xóa bất kỳ công việc nào của toàn bộ nhân sự.'
            : 'Theo dõi tổng thể tiến độ công việc của tất cả nhân sự trong công ty (Chế độ chỉ đọc).'}
        </p>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc mô tả..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TaskStatus | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="TODO">Cần làm</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="DONE">Hoàn thành</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value as TaskPriority | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả độ ưu tiên</option>
          <option value="LOW">Ưu tiên thấp</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HIGH">Ưu tiên cao</option>
        </select>
      </div>

      {/* Table */}
      {allTasksQuery.isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TableSkeleton rows={5} />
        </div>
      ) : allTasksQuery.isError ? (
        <ErrorState
          message="Không thể tải danh sách toàn bộ công việc."
          onRetry={() => void allTasksQuery.refetch()}
        />
      ) : allTasksQuery.data && allTasksQuery.data.items.length === 0 ? (
        <EmptyState
          title="Không có công việc nào"
          description="Không tìm thấy công việc nào khớp với tiêu chí lọc."
        />
      ) : allTasksQuery.data ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Công việc</th>
                  <th className="py-3.5 px-4">Người tạo</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Ưu tiên</th>
                  <th className="py-3.5 px-4">Hạn chót</th>
                  {isSuperAdmin && (
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {allTasksQuery.data.items.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 max-w-sm">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {task.user ? (
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              fullName={task.user.fullName}
                              avatarUrl={task.user.avatarUrl}
                              size="sm"
                            />
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {task.user.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {task.user.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Không xác định</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <TaskStatusBadge status={task.status} />
                      </td>

                      <td className="py-4 px-4">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>

                      <td className="py-4 px-4">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              overdue
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-slate-600 dark:text-slate-300'
                            )}
                          >
                            {overdue ? 'Quá hạn: ' : ''}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Chưa đặt</span>
                        )}
                      </td>

                      {isSuperAdmin && (
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTask(task)}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng số: {allTasksQuery.data.total} công việc</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Trang {allTasksQuery.data.page} / {allTasksQuery.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= allTasksQuery.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Sau
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TaskFormModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        initialTask={editingTask}
        onSubmitTask={async (payload) => {
          await updateMutation.mutateAsync(payload);
        }}
        isSaving={updateMutation.isPending}
      />

      <DeleteTaskConfirmModal
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={async (taskId) => {
          await deleteMutation.mutateAsync(taskId);
        }}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
