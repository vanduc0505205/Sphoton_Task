import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { ApiClientError, authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const registerFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
      .max(100, 'Họ và tên không vượt quá 100 ký tự'),
    email: z.string().trim().email('Địa chỉ email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Bạn cần đồng ý với điều khoản sử dụng để tiếp tục',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const watchedPassword = watch('password');

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const res = await authApi.register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });

      setRegisteredEmail(values.email);
      setCountdown(60);

      showToast({
        title: 'Đăng ký thành công',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể đăng ký tài khoản, vui lòng thử lại';
      showToast({
        title: 'Đăng ký thất bại',
        description: message,
        variant: 'error',
      });
    }
  };

  const handleResendEmail = async () => {
    if (!registeredEmail || countdown > 0 || isResending) {
      return;
    }
    setIsResending(true);
    try {
      const res = await authApi.resendVerification(registeredEmail);
      setCountdown(60);
      showToast({
        title: 'Đã gửi lại email xác thực',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể gửi lại email xác thực';
      showToast({
        title: 'Gửi lại thất bại',
        description: message,
        variant: 'error',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <AuthLayout
        title="Kiểm tra hộp thư của bạn"
        subtitle="Chúng tôi vừa gửi một liên kết xác thực tài khoản tới địa chỉ email bạn đã đăng ký."
      >
        <div className="p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
            <MailCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Email xác thực đã được gửi tới:
            </p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 break-all">
              {registeredEmail}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Liên kết xác thực có hiệu lực trong vòng <strong>24 giờ</strong>. Trên môi trường phát triển (dev), bạn cũng có thể xem và nhấp trực tiếp vào đường dẫn được in trong cửa sổ terminal của server.
          </p>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              disabled={countdown > 0 || isResending}
              onClick={handleResendEmail}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {countdown > 0
                ? `Gửi lại email sau (${countdown}s)`
                : 'Gửi lại email xác thực'}
            </button>

            <Link
              to="/login"
              className="block w-full py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Tạo tài khoản mới"
      subtitle="Tham gia hệ thống quản lý nhân sự và công việc SphotonTask."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Nguyễn Văn A"
            {...register('fullName')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {errors.fullName && (
            <p className="text-xs text-rose-500 mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Email công việc <span className="text-rose-500">*</span>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Mật khẩu <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu tối thiểu 8 ký tự"
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
          <PasswordStrengthMeter password={watchedPassword} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Xác nhận mật khẩu <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              {...register('confirmPassword')}
              className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Ẩn/Hiện mật khẩu xác nhận"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-rose-500 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tôi đồng ý với{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Điều khoản dịch vụ
              </span>{' '}
              và{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Chính sách bảo mật nhân sự
              </span>{' '}
              của Sphoton Technology.
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs text-rose-500 mt-1">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Đăng ký tài khoản
        </button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
