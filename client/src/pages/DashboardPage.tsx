import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiClientError, taskApi, UpsertTaskPayload } from '../lib/api';
import { formatDate, isTaskOverdue } from '../lib/utils';
import { TaskPriorityBadge, TaskStatusBadge } from '../components/ui/Badges';
import { EmptyState, ErrorState, StatsSkeleton, TableSkeleton } from '../components/ui/States';
import { TaskFormModal } from '../components/tasks/TaskDialogs';

export function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const statsQuery = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: async () => {
      const res = await taskApi.getStats();
      return res.data.stats;
    },
  });

  const upcomingTasksQuery = useQuery({
    queryKey: ['tasks', 'upcoming'],
    queryFn: async () => {
      const res = await taskApi.getMyTasks({
        page: 1,
        limit: 8,
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });
      return res.data.items;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertTaskPayload) => taskApi.createTask(payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateOpen(false);
      showToast({
        title: 'Đã tạo công việc',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể tạo công việc';
      showToast({
        title: 'Lỗi tạo công việc',
        description: msg,
        variant: 'error',
      });
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'TODO' | 'IN_PROGRESS' | 'DONE' }) =>
      taskApi.updateTask(id, { status }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast({
        title: 'Đã cập nhật trạng thái',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể cập nhật trạng thái';
      showToast({
        title: 'Cập nhật thất bại',
        description: msg,
        variant: 'error',
      });
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Xin chào, {user.fullName} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dưới đây là tổng quan tiến độ công việc cá nhân của bạn trong hôm nay.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo công việc mới
        </button>
      </div>

      {/* Statistics Cards */}
      {statsQuery.isLoading ? (
        <StatsSkeleton />
      ) : statsQuery.isError ? (
        <ErrorState
          message="Không thể tải số liệu thống kê công việc."
          onRetry={() => void statsQuery.refetch()}
        />
      ) : statsQuery.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tổng số công việc
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {statsQuery.data.total}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Đang thực hiện
              </p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {statsQuery.data.inProgress}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Đã hoàn thành
              </p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {statsQuery.data.completed}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Quá hạn hoàn thành
              </p>
              <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                {statsQuery.data.overdue}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Upcoming Tasks Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Công việc sắp đến hạn & Cần chú ý
            </h2>
          </div>

          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Xem tất cả công việc
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingTasksQuery.isLoading ? (
          <TableSkeleton rows={4} />
        ) : upcomingTasksQuery.isError ? (
          <div className="p-6">
            <ErrorState
              message="Không thể tải danh sách công việc sắp đến hạn."
              onRetry={() => void upcomingTasksQuery.refetch()}
            />
          </div>
        ) : upcomingTasksQuery.data && upcomingTasksQuery.data.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingTasksQuery.data.map((task) => {
              const overdue = isTaskOverdue(task.dueDate, task.status);
              return (
                <div
                  key={task.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === 'DONE'}
                      onChange={(e) => {
                        const nextStatus = e.target.checked ? 'DONE' : 'TODO';
                        quickStatusMutation.mutate({
                          id: task.id,
                          status: nextStatus,
                        });
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Đánh dấu hoàn thành nhanh"
                    />
                    <div className="min-w-0">
                      <p
                        className={
                          task.status === 'DONE'
                            ? 'text-sm font-medium line-through text-slate-400 dark:text-slate-500'
                            : 'text-sm font-semibold text-slate-900 dark:text-white'
                        }
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                    {task.dueDate ? (
                      <span
                        className={
                          overdue
                            ? 'text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800'
                            : 'text-xs text-slate-500 dark:text-slate-400'
                        }
                      >
                        {overdue ? 'Quá hạn: ' : 'Hạn: '}
                        {formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa đặt hạn</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="Chưa có công việc nào"
              description="Bạn chưa tạo công việc nào. Hãy thêm đầu việc đầu tiên để bắt đầu quản lý tiến độ."
              action={
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Tạo công việc ngay
                </button>
              }
            />
          </div>
        )}
      </div>

      <TaskFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialTask={null}
        onSubmitTask={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}
