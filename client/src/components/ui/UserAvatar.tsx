import React from 'react';
import { cn, getInitials, resolveAvatarUrl } from '../../lib/utils';

interface UserAvatarProps {
  fullName: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({
  fullName,
  avatarUrl,
  size = 'md',
  className,
}: UserAvatarProps) {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);

  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-20 h-20 text-xl',
  };

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={fullName}
        className={cn(
          'rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0',
          sizeMap[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center shrink-0 select-none',
        sizeMap[size],
        className
      )}
    >
      {getInitials(fullName)}
    </div>
  );
}
