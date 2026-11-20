import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Eye, EyeOff, KeyRound, Loader2, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiClientError, authApi, profileApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import { RoleBadge } from '../components/ui/Badges';
import { UserAvatar } from '../components/ui/UserAvatar';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';

const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không vượt quá 100 ký tự'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu mới phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu mới phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu mới phải có ít nhất 1 chữ số'),
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: user ? user.fullName : '',
    },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const watchedNewPassword = passwordForm.watch('newPassword');

  if (!user) {
    return null;
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    const file = fileList[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showToast({
        title: 'Định dạng không hỗ trợ',
        description: 'Vui lòng chọn tệp ảnh định dạng JPG, PNG hoặc WEBP.',
        variant: 'error',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast({
        title: 'Dung lượng ảnh quá lớn',
        description: 'Kích thước ảnh tải lên tối đa là 2MB.',
        variant: 'error',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await profileApi.uploadAvatar(file);
      setUser(res.data.user);
      showToast({
        title: 'Đã cập nhật ảnh đại diện',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải ảnh đại diện lên';
      showToast({
        title: 'Lỗi tải ảnh',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    try {
      const res = await profileApi.updateProfile({ fullName: values.fullName });
      setUser(res.data.user);
      showToast({
        title: 'Cập nhật hồ sơ thành công',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể cập nhật thông tin hồ sơ';
      showToast({
        title: 'Cập nhật thất bại',
        description: msg,
        variant: 'error',
      });
    }
  };

  const handlePasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      const res = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      showToast({
        title: 'Đổi mật khẩu thành công',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Không thể đổi mật khẩu';
      showToast({
        title: 'Đổi mật khẩu thất bại',
        description: msg,
        variant: 'error',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Hồ sơ cá nhân & Bảo mật
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Quản lý thông tin định danh nhân sự, ảnh đại diện và mật khẩu đăng nhập.
        </p>
      </div>

      {/* Avatar & Overview Card */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <UserAvatar
            fullName={user.fullName}
            avatarUrl={user.avatarUrl}
            size="xl"
          />
          <button
            type="button"
            disabled={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors"
            title="Đổi ảnh đại diện"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
        </div>

        <div className="text-center sm:text-left flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user.fullName}
            </h2>
            <RoleBadge role={user.role} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user.email}
          </p>
          <p className="text-xs text-slate-400">
            Tham gia hệ thống từ ngày {formatDate(user.createdAt)} • Hỗ trợ ảnh JPG, PNG, WEBP tối đa 2MB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Full Name Form */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5 h-fit">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Thông tin cơ bản
            </h3>
          </div>

          <form
            onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Địa chỉ Email (Không thể thay đổi)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Họ và tên nhân sự
              </label>
              <input
                type="text"
                {...profileForm.register('fullName')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              {profileForm.formState.errors.fullName && (
                <p className="text-xs text-rose-500 mt-1">
                  {profileForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {profileForm.formState.isSubmitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Lưu thay đổi
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Đổi mật khẩu bảo mật
            </h3>
          </div>

          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu hiện tại"
                  {...passwordForm.register('currentPassword')}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-rose-500 mt-1">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự, chữ hoa, chữ thường, số"
                  {...passwordForm.register('newPassword')}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-rose-500 mt-1">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
              <PasswordStrengthMeter password={watchedNewPassword} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                {...passwordForm.register('confirmNewPassword')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-xs text-rose-500 mt-1">
                  {passwordForm.formState.errors.confirmNewPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {passwordForm.formState.isSubmitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Đổi mật khẩu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
