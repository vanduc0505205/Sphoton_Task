import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Layers, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-950">
      {/* Left column: Form */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Sphoton<span className="text-indigo-600 dark:text-indigo-400">Task</span>
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-1">
                HR & Work Management
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            aria-label="Đổi giao diện Sáng/Tối"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-10">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {subtitle}
            </p>
          </div>
          {children}
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
          © 2026 Sphoton Technology. Nền tảng quản trị nhân sự & hiệu suất doanh nghiệp.
        </div>
      </div>

      {/* Right column: Brand Slogan & Visual */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-12 xl:p-16 text-white flex-col justify-between">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            Không gian làm việc số chuẩn SaaS
          </span>
        </div>

        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Đồng bộ mục tiêu nhân sự, nâng tầm hiệu suất đội ngũ.
            </h2>
            <p className="text-indigo-100/90 text-base leading-relaxed max-w-lg">
              SphotonTask giúp doanh nghiệp quản lý phân quyền nhân sự chặt chẽ, theo dõi tiến độ công việc trực quan theo thời gian thực với chuẩn bảo mật cao nhất.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-lg">
            <div className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-indigo-500/40 text-white shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Quản lý công việc đa chế độ (Bảng & Kanban)
                </h3>
                <p className="text-xs text-indigo-100/80 mt-1">
                  Kéo thả linh hoạt, cảnh báo hạn chót thông minh và thống kê hiệu suất tức thì.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-indigo-500/40 text-white shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Phân quyền RBAC đa tầng & Xác thực an toàn
                </h3>
                <p className="text-xs text-indigo-100/80 mt-1">
                  Bảo vệ tài khoản với xác thực hai lớp qua email, tự động xoay vòng phiên đăng nhập.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-200/80 border-t border-white/15 pt-6">
          <span>Thiết kế tối giản lấy cảm hứng từ Linear & Notion</span>
          <span className="font-semibold text-white">Phiên bản Enterprise 1.0</span>
        </div>
      </div>
    </div>
  );
}
