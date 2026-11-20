import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PasswordStrengthMeter({ password }: { password: string }) {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const checks = [
    { label: 'Ít nhất 8 ký tự', passed: hasMinLength },
    { label: 'Chữ cái viết hoa (A-Z)', passed: hasUpper },
    { label: 'Chữ cái viết thường (a-z)', passed: hasLower },
    { label: 'Chữ số (0-9)', passed: hasNumber },
  ];

  const score = checks.filter((c) => c.passed).length;

  const strengthText =
    score === 0
      ? 'Chưa nhập'
      : score === 1
      ? 'Rất yếu'
      : score === 2
      ? 'Trung bình'
      : score === 3
      ? 'Khá mạnh'
      : 'Rất mạnh';

  const barColor =
    score <= 1
      ? 'bg-rose-500'
      : score === 2
      ? 'bg-amber-500'
      : score === 3
      ? 'bg-indigo-500'
      : 'bg-emerald-500';

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Độ mạnh mật khẩu:</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {strengthText}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-colors',
              score >= step ? barColor : 'bg-slate-200 dark:bg-slate-800'
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              check.passed
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {check.passed ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 shrink-0" />
            )}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
