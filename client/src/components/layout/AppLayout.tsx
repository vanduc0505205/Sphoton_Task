import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { RoleBadge } from '../ui/Badges';
import { UserAvatar } from '../ui/UserAvatar';
import { cn } from '../../lib/utils';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return null;
  }

  const isAdminOrSuper = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = headerSearch.trim();
    if (trimmed.length > 0) {
      navigate(`/tasks?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/tasks');
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    showToast({
      title: 'Đã đăng xuất',
      description: 'Hẹn gặp lại bạn trên SphotonTask.',
      variant: 'info',
    });
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
      isActive
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
    );

  const renderSidebarLinks = (onNavigate?: () => void) => (
    <div className="flex flex-col flex-1 justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Không gian cá nhân
          </p>
          <nav className="space-y-1">
            <NavLink to="/" end className={navLinkClass} onClick={onNavigate}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Tổng quan (Dashboard)</span>
            </NavLink>
            <NavLink to="/tasks" className={navLinkClass} onClick={onNavigate}>
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>Công việc của tôi</span>
            </NavLink>
            <NavLink to="/profile" className={navLinkClass} onClick={onNavigate}>
              <UserCircle className="w-4 h-4 shrink-0" />
              <span>Hồ sơ cá nhân</span>
            </NavLink>
          </nav>
        </div>

        {isAdminOrSuper && (
          <div>
            <div className="flex items-center gap-1.5 px-3.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quản trị hệ thống
              </p>
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin/users" className={navLinkClass} onClick={onNavigate}>
                <Users className="w-4 h-4 shrink-0" />
                <span>Danh sách nhân sự</span>
              </NavLink>
              <NavLink to="/admin/tasks" className={navLinkClass} onClick={onNavigate}>
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Toàn bộ công việc</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <UserAvatar fullName={user.fullName} avatarUrl={user.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Vai trò:</span>
          <RoleBadge role={user.role} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-5">
        <Link to="/" className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Sphoton<span className="text-indigo-600 dark:text-indigo-400">Task</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-medium -mt-0.5">
              Workspace & HR
            </span>
          </div>
        </Link>

        {renderSidebarLinks()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-full bg-white dark:bg-slate-900 h-full px-4 py-5 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-2 mb-6">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  SphotonTask
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarLinks(() => setMobileMenuOpen(false))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Tìm kiếm nhanh công việc..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <UserAvatar
                  fullName={user.fullName}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                />
                <span className="hidden sm:block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
                  {user.fullName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                    <div className="mt-2">
                      <RoleBadge role={user.role} />
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      Hồ sơ & Đổi mật khẩu
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
