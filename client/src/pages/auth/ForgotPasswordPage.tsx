import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ApiClientError, authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      const res = await authApi.forgotPassword(values.email);
      setSubmitted(true);
      showToast({
        title: 'Yêu cầu đã được tiếp nhận',
        description: res.message,
        variant: 'info',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể xử lý yêu cầu lúc này';
      showToast({
        title: 'Gửi yêu cầu thất bại',
        description: msg,
        variant: 'error',
      });
    }
  };

  return (
    <AuthLayout
      title="Khôi phục mật khẩu"
      subtitle="Nhập địa chỉ email đăng ký tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu."
    >
      {submitted ? (
        <div className="p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Đã gửi hướng dẫn khôi phục
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Nếu địa chỉ email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu có hiệu lực trong vòng <strong>30 phút</strong> đã được gửi tới hộp thư của bạn.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Quay lại trang Đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Gửi liên kết đặt lại mật khẩu
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang Đăng nhập
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
