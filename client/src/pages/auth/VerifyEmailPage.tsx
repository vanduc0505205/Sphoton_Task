import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ApiClientError, authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

type VerificationState = 'VERIFYING' | 'SUCCESS' | 'ERROR';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [status, setStatus] = useState<VerificationState>('VERIFYING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>(emailParam ? emailParam : '');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const hasCalledRef = useRef<boolean>(false);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (hasCalledRef.current) {
      return;
    }
    hasCalledRef.current = true;

    if (!tokenParam) {
      setStatus('ERROR');
      setErrorMessage('Thiếu mã xác thực trong đường dẫn. Vui lòng kiểm tra lại liên kết trong email.');
      return;
    }

    const runVerify = async () => {
      try {
        const res = await authApi.verifyEmail(tokenParam);
        setStatus('SUCCESS');
        showToast({
          title: 'Xác thực thành công',
          description: res.message,
          variant: 'success',
        });
      } catch (err: unknown) {
        const msg =
          err instanceof ApiClientError
            ? err.message
            : 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.';
        setStatus('ERROR');
        setErrorMessage(msg);
      }
    };

    void runVerify();
  }, [tokenParam, showToast]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = resendEmail.trim();
    if (!trimmed) {
      showToast({
        title: 'Thiếu địa chỉ email',
        description: 'Vui lòng nhập email để gửi lại liên kết xác thực.',
        variant: 'error',
      });
      return;
    }

    setIsResending(true);
    try {
      const res = await authApi.resendVerification(trimmed);
      setCountdown(60);
      showToast({
        title: 'Đã gửi lại email xác thực',
        description: res.message,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể gửi lại email xác thực';
      showToast({
        title: 'Gửi lại thất bại',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Xác thực địa chỉ Email"
      subtitle="Xác nhận danh tính tài khoản của bạn để kích hoạt quyền truy cập SphotonTask."
    >
      {status === 'VERIFYING' && (
        <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Đang xác thực tài khoản của bạn...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vui lòng đợi trong giây lát, hệ thống đang kiểm tra mã xác thực.
          </p>
        </div>
      )}

      {status === 'SUCCESS' && (
        <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Xác thực Email thành công!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tài khoản của bạn đã được kích hoạt đầy đủ. Bây giờ bạn có thể đăng nhập vào hệ thống.
            </p>
          </div>
          <Link
            to="/login"
            className="block w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Đi tới trang Đăng nhập
          </Link>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Không thể xác thực tài khoản
            </h3>
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          </div>

          <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nhập email của bạn để nhận liên kết xác thực mới:
            </label>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="ten.nhanvien@sphoton.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isResending || countdown > 0}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {countdown > 0
                ? `Gửi lại sau (${countdown}s)`
                : 'Gửi lại email xác thực'}
            </button>
          </form>

          <Link
            to="/login"
            className="block text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Quay lại trang Đăng nhập
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
