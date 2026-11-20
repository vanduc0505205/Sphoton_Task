import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { ApiClientError, authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password');

  if (!token) {
    return (
      <AuthLayout
        title="Liên kết không hợp lệ"
        subtitle="Không tìm thấy mã đặt lại mật khẩu trong đường dẫn."
      >
        <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Liên kết khôi phục mật khẩu bị thiếu hoặc không hợp lệ. Vui lòng gửi lại yêu cầu mới.
          </p>
          <Link
            to="/forgot-password"
            className="block w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Yêu cầu liên kết mới
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    try {
      const res = await authApi.resetPassword({
        token,
        password: values.password,
      });
      showToast({
        title: 'Đặt lại mật khẩu thành công',
        description: res.message,
        variant: 'success',
      });
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể đặt lại mật khẩu, liên kết có thể đã hết hạn.';
      showToast({
        title: 'Đặt lại mật khẩu thất bại',
        description: msg,
        variant: 'error',
      });
    }
  };

  return (
    <AuthLayout
      title="Thiết lập mật khẩu mới"
      subtitle="Vui lòng chọn mật khẩu mạnh và chưa từng sử dụng trước đây."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới"
              {...register('password')}
              className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
          )}
          <PasswordStrengthMeter password={watchedPassword} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu mới"
            {...register('confirmPassword')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-rose-500 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Cập nhật mật khẩu
        </button>
      </form>
    </AuthLayout>
  );
}
