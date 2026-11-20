import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  GripVertical,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ApiClientError, taskApi, UpsertTaskPayload } from '../lib/api';
import { TaskDto, TaskPriority, TaskStatus } from '../types/api.types';
import { cn, formatDate, isTaskOverdue } from '../lib/utils';
import { TaskPriorityBadge } from '../components/ui/Badges';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/States';
import {
  DeleteTaskConfirmModal,
  TaskFormModal,
} from '../components/tasks/TaskDialogs';

type ViewMode = 'TABLE' | 'KANBAN';

const KANBAN_COLUMNS: { status: TaskStatus; title: string; accent: string }[] = [
  { status: 'TODO', title: 'Cần làm (To Do)', accent: 'border-t-slate-400' },
  {
    status: 'IN_PROGRESS',
    title: 'Đang thực hiện',
    accent: 'border-t-indigo-600',
  },
  { status: 'DONE', title: 'Hoàn thành', accent: 'border-t-emerald-600' },
];

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get('search');

  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [searchInput, setSearchInput] = useState<string>(
    initialSearch ? initialSearch : ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState<string>(
    initialSearch ? initialSearch : ''
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  useEffect(() => {
    const paramVal = searchParams.get('search');
    if (paramVal !== null && paramVal !== searchInput) {
      setSearchInput(paramVal);
      setDebouncedSearch(paramVal);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const limit = viewMode === 'KANBAN' ? 50 : 8;

  const tasksQuery = useQuery({
    queryKey: [
      'tasks',
      'list',
      {
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const res = await taskApi.getMyTasks({
        page,
        limit,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: statusFilter !== '' ? statusFilter : undefined,
        priority: priorityFilter !== '' ? priorityFilter : undefined,
        sortBy,
        sortOrder,
      });
      return res.data;
    },
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (payload: UpsertTaskPayload) => {
      if (editingTask) {
        return taskApi.updateTask(editingTask.id, payload);
      }
      return taskApi.createTask(payload);
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsModalOpen(false);
      setEditingTask(null);
      showToast({
        title: editingTask ? 'Đã cập nhật công việc' : 'Đã tạo công việc mới',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể lưu công việc';
      showToast({
        title: 'Thao tác thất bại',
        description: msg,
        variant: 'error',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      taskApi.updateTask(id, { status }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast({
        title: 'Đã đổi trạng thái',
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
        title: 'Lỗi cập nhật',
        description: msg,
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.deleteTask(taskId),
    onSuccess: (res) => {
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
        title: 'Xóa thất bại',
        description: msg,
        variant: 'error',
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TaskDto) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDropOnColumn = (targetStatus: TaskStatus) => {
    setDragOverColumn(null);
    if (!draggedTaskId || !tasksQuery.data) {
      return;
    }
    const found = tasksQuery.data.items.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);

    if (found && found.status !== targetStatus) {
      statusMutation.mutate({ id: found.id, status: targetStatus });
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters =
    debouncedSearch.length > 0 || statusFilter !== '' || priorityFilter !== '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Công việc của tôi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý, phân loại và kéo thả trạng thái các đầu việc cá nhân của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                viewMode === 'TABLE'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Bảng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                viewMode === 'KANBAN'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Columns3 className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm công việc
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc mô tả..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TaskStatus | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="TODO">Cần làm</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="DONE">Hoàn thành</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as TaskPriority | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">Tất cả độ ưu tiên</option>
              <option value="LOW">Ưu tiên thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Ưu tiên cao</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(':');
                setSortBy(field as 'createdAt' | 'dueDate');
                setSortOrder(order as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="createdAt:desc">Mới tạo nhất</option>
              <option value="createdAt:asc">Cũ nhất trước</option>
              <option value="dueDate:asc">Hạn chót gần nhất</option>
              <option value="dueDate:desc">Hạn chót xa nhất</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-indigo-500" />
              Đang áp dụng bộ lọc tìm kiếm
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Xóa toàn bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Loading / Error / Empty / View */}
      {tasksQuery.isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TableSkeleton rows={6} />
        </div>
      ) : tasksQuery.isError ? (
        <ErrorState
          message="Không thể tải danh sách công việc của bạn."
          onRetry={() => void tasksQuery.refetch()}
        />
      ) : tasksQuery.data && tasksQuery.data.items.length === 0 ? (
        <EmptyState
          title="Không tìm thấy công việc nào"
          description={
            hasActiveFilters
              ? 'Không có công việc nào khớp với bộ lọc hiện tại của bạn.'
              : 'Danh sách công việc của bạn đang trống. Hãy thêm công việc mới để bắt đầu!'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Đặt lại bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Tạo công việc đầu tiên
              </button>
            )
          }
        />
      ) : tasksQuery.data && viewMode === 'TABLE' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Công việc</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Mức ưu tiên</th>
                  <th className="py-3.5 px-4">Hạn hoàn thành</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {tasksQuery.data.items.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 max-w-md">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'DONE'}
                            onChange={(e) => {
                              const nextStatus: TaskStatus = e.target.checked
                                ? 'DONE'
                                : 'TODO';
                              statusMutation.mutate({
                                id: task.id,
                                status: nextStatus,
                              });
                            }}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p
                              className={
                                task.status === 'DONE'
                                  ? 'font-medium line-through text-slate-400 dark:text-slate-500'
                                  : 'font-semibold text-slate-900 dark:text-white'
                              }
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            statusMutation.mutate({
                              id: task.id,
                              status: e.target.value as TaskStatus,
                            })
                          }
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          <option value="TODO">Cần làm</option>
                          <option value="IN_PROGRESS">Đang làm</option>
                          <option value="DONE">Hoàn thành</option>
                        </select>
                      </td>

                      <td className="py-4 px-4">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>

                      <td className="py-4 px-4">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium',
                              overdue
                                ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800'
                                : 'text-slate-600 dark:text-slate-300'
                            )}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {overdue ? 'Quá hạn: ' : ''}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Không có hạn</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(task)}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTask(task)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Xóa công việc"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Hiển thị <strong>{tasksQuery.data.items.length}</strong> trên tổng số{' '}
              <strong>{tasksQuery.data.total}</strong> công việc
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-200 px-2">
                Trang {tasksQuery.data.page} / {tasksQuery.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= tasksQuery.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Sau
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : tasksQuery.data ? (
        /* Kanban 3-Column Drag & Drop View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasksQuery.data.items.filter(
              (item) => item.status === col.status
            );
            const isOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.status);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnColumn(col.status);
                }}
                className={cn(
                  'rounded-xl border border-slate-200 dark:border-slate-800 border-t-4 bg-slate-100/70 dark:bg-slate-900/60 p-4 flex flex-col min-h-[420px] transition-colors',
                  col.accent,
                  isOver && 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {col.title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                      Kéo thả công việc vào cột này
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isTaskOverdue(task.dueDate, task.status);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <h4
                                className={
                                  task.status === 'DONE'
                                    ? 'text-sm font-medium line-through text-slate-400'
                                    : 'text-sm font-semibold text-slate-900 dark:text-white'
                                }
                              >
                                {task.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(task)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                title="Sửa"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTask(task)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <TaskPriorityBadge priority={task.priority} />

                            {task.dueDate && (
                              <span
                                className={cn(
                                  'text-[11px] font-medium',
                                  overdue
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-slate-500 dark:text-slate-400'
                                )}
                              >
                                {overdue ? 'Quá hạn: ' : ''}
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
        onSubmitTask={async (payload) => {
          await saveTaskMutation.mutateAsync(payload);
        }}
        isSaving={saveTaskMutation.isPending}
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
