import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, Loader2, MailWarning, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ApiClientError, authApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const loginFormSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const { setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setUnverifiedEmail(null);

    try {
      const res = await authApi.login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      setUser(res.data.user);
      showToast({
        title: 'Đăng nhập thành công',
        description: `Chào mừng ${res.data.user.fullName} quay trở lại!`,
        variant: 'success',
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 403 && err.message.includes('xác thực email')) {
          setUnverifiedEmail(values.email);
        }
        setServerError(err.message);
        showToast({
          title: 'Đăng nhập không thành công',
          description: err.message,
          variant: 'error',
        });
      } else {
        setServerError('Không thể kết nối tới máy chủ, vui lòng thử lại.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || isResending) {
      return;
    }
    setIsResending(true);
    try {
      const res = await authApi.resendVerification(unverifiedEmail);
      showToast({
        title: 'Đã gửi lại liên kết xác thực',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể gửi lại email xác thực';
      showToast({
        title: 'Lỗi gửi lại email',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập hệ thống"
      subtitle="Nhập thông tin tài khoản SphotonTask của bạn để bắt đầu làm việc."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && !unverifiedEmail && (
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {unverifiedEmail && (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
            <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
              <MailWarning className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Tài khoản chưa được xác thực Email</p>
                <p className="mt-0.5 leading-relaxed">
                  Vui lòng kiểm tra hộp thư <strong>{unverifiedEmail}</strong> hoặc nhấn nút bên dưới để nhận lại liên kết kích hoạt.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isResending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Gửi lại email xác thực ngay
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Địa chỉ Email
          </label>
          <input
            type="email"
            placeholder="ten.nhanvien@sphoton.com"
            {...register('email')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {errors.email && (
            <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu của bạn"
              {...register('password')}
              className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Ẩn/Hiện mật khẩu"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Ghi nhớ đăng nhập (7 ngày)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Đăng nhập
        </button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Đăng ký tài khoản mới
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
