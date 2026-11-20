import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Search,
  Shield,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminApi, ApiClientError } from '../../lib/api';
import { AdminUserStatusFilter, UserDto, UserRole } from '../../types/api.types';
import { formatDate } from '../../lib/utils';
import { RoleBadge } from '../../components/ui/Badges';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/States';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter | ''>('');
  const [page, setPage] = useState<number>(1);
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const usersQuery = useQuery({
    queryKey: [
      'admin',
      'users',
      { page, search: debouncedSearch, role: roleFilter, status: statusFilter },
    ],
    queryFn: async () => {
      const res = await adminApi.getUsers({
        page,
        limit: 10,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        role: roleFilter !== '' ? roleFilter : undefined,
        status: statusFilter !== '' ? statusFilter : undefined,
      });
      return res.data;
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminApi.changeUserRole(userId, role),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast({
        title: 'Đã cập nhật vai trò',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể đổi vai trò';
      showToast({
        title: 'Thao tác thất bại',
        description: msg,
        variant: 'error',
      });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: ({ userId, isLocked }: { userId: string; isLocked: boolean }) =>
      adminApi.toggleUserLock(userId, isLocked),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast({
        title: 'Đã cập nhật trạng thái tài khoản',
        description: res.message,
        variant: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể thay đổi trạng thái khóa';
      showToast({
        title: 'Thao tác thất bại',
        description: msg,
        variant: 'error',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setUserToDelete(null);
      showToast({
        title: 'Đã xóa người dùng',
        description: res.message,
        variant: 'info',
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể xóa tài khoản người dùng';
      showToast({
        title: 'Xóa thất bại',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quản lý nhân sự (Users)
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Toàn quyền quản lý vai trò (RBAC), khóa/mở khóa và xóa tài khoản người dùng.'
              : 'Chế độ xem danh sách nhân sự dành cho Quản trị viên (Chỉ đọc).'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo họ tên hoặc email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as UserRole | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả vai trò</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Quản trị viên (Admin)</option>
          <option value="USER">Nhân viên (User)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AdminUserStatusFilter | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="UNVERIFIED">Chưa xác thực Email</option>
          <option value="LOCKED">Đang bị khóa</option>
        </select>
      </div>

      {/* Table */}
      {usersQuery.isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TableSkeleton rows={5} />
        </div>
      ) : usersQuery.isError ? (
        <ErrorState
          message="Không thể tải danh sách người dùng."
          onRetry={() => void usersQuery.refetch()}
        />
      ) : usersQuery.data && usersQuery.data.items.length === 0 ? (
        <EmptyState
          title="Không tìm thấy nhân sự nào"
          description="Không có tài khoản nào khớp với tiêu chí tìm kiếm hiện tại."
        />
      ) : usersQuery.data ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Nhân sự</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Ngày tham gia</th>
                  {isSuperAdmin && (
                    <th className="py-3.5 px-4 text-right">Quản trị</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {usersQuery.data.items.map((item) => {
                  const isSelf = item.id === currentUser.id;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            fullName={item.fullName}
                            avatarUrl={item.avatarUrl}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {item.fullName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isSuperAdmin && !isSelf ? (
                          <select
                            value={item.role}
                            onChange={(e) =>
                              changeRoleMutation.mutate({
                                userId: item.id,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            <option value="USER">Nhân viên (USER)</option>
                            <option value="ADMIN">Quản trị viên (ADMIN)</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          </select>
                        ) : (
                          <RoleBadge role={item.role} />
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.isLocked ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                              Đã khóa
                            </span>
                          ) : item.isEmailVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                              Chưa xác thực Email
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>

                      {isSuperAdmin && (
                        <td className="py-4 px-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-400 italic">
                              Tài khoản hiện tại
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleLockMutation.mutate({
                                    userId: item.id,
                                    isLocked: !item.isLocked,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                title={
                                  item.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'
                                }
                              >
                                {item.isLocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Mở khóa</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Khóa</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setUserToDelete(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="Xóa người dùng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng số: {usersQuery.data.total} nhân sự</span>
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
                Trang {usersQuery.data.page} / {usersQuery.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= usersQuery.data.totalPages}
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

      {/* Confirm Delete User Modal */}
      {userToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          title="Xác nhận xóa tài khoản nhân sự"
          description="Toàn bộ dữ liệu công việc của nhân sự này cũng sẽ bị xóa vĩnh viễn."
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Bạn có chắc chắn muốn xóa tài khoản{' '}
                <strong>{userToDelete.fullName}</strong> ({userToDelete.email})?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(userToDelete.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteUserMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Xóa tài khoản
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
