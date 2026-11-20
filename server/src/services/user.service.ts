import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PaginatedResult, SafeUserDto, UserRole } from '../types';
import { AppError } from '../utils/appError';
import { toSafeUserDto } from './auth.service';

export async function updateProfileFullName(
  userId: string,
  fullName: string
): Promise<SafeUserDto> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { fullName },
  });

  return toSafeUserDto(user);
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string
): Promise<SafeUserDto> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  return toSafeUserDto(user);
}

export async function listUsersForAdmin(params: {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: 'ACTIVE' | 'LOCKED' | 'UNVERIFIED';
}): Promise<PaginatedResult<SafeUserDto>> {
  const where: Prisma.UserWhereInput = {};

  if (params.role) {
    where.role = params.role;
  }

  if (params.status === 'LOCKED') {
    where.isLocked = true;
  } else if (params.status === 'UNVERIFIED') {
    where.isEmailVerified = false;
  } else if (params.status === 'ACTIVE') {
    where.isLocked = false;
    where.isEmailVerified = true;
  }

  if (params.search && params.search.length > 0) {
    where.OR = [
      { fullName: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  const skip = (params.page - 1) * params.limit;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.limit));

  return {
    items: users.map((u) => toSafeUserDto(u)),
    total,
    page: params.page,
    limit: params.limit,
    totalPages,
  };
}

export async function changeUserRole(
  targetUserId: string,
  newRole: UserRole,
  actorId: string
): Promise<SafeUserDto> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  if (targetUserId === actorId && newRole !== 'SUPER_ADMIN') {
    throw new AppError(
      'Bạn không thể tự hạ quyền SUPER_ADMIN của chính mình',
      400,
      'CANNOT_DEMOTE_SELF'
    );
  }

  if (targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' },
    });
    if (superAdminCount <= 1) {
      throw new AppError(
        'Hệ thống luôn phải có ít nhất 1 tài khoản SUPER_ADMIN',
        400,
        'LAST_SUPER_ADMIN'
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  return toSafeUserDto(updated);
}

export async function toggleUserLock(
  targetUserId: string,
  isLocked: boolean,
  actorId: string
): Promise<SafeUserDto> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  if (targetUserId === actorId && isLocked) {
    throw new AppError(
      'Bạn không thể tự khóa tài khoản của chính mình',
      400,
      'CANNOT_LOCK_SELF'
    );
  }

  if (targetUser.role === 'SUPER_ADMIN' && isLocked) {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', isLocked: false },
    });
    if (activeSuperAdmins <= 1) {
      throw new AppError(
        'Không thể khóa tài khoản SUPER_ADMIN đang hoạt động cuối cùng',
        400,
        'LAST_SUPER_ADMIN'
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isLocked,
      failedLoginAttempts: isLocked ? targetUser.failedLoginAttempts : 0,
      lockUntil: isLocked ? targetUser.lockUntil : null,
    },
  });

  if (isLocked) {
    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return toSafeUserDto(updated);
}

export async function deleteUserById(
  targetUserId: string,
  actorId: string
): Promise<void> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  if (targetUserId === actorId) {
    throw new AppError(
      'Bạn không thể tự xóa tài khoản của chính mình',
      400,
      'CANNOT_DELETE_SELF'
    );
  }

  if (targetUser.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' },
    });
    if (superAdminCount <= 1) {
      throw new AppError(
        'Không thể xóa tài khoản SUPER_ADMIN cuối cùng của hệ thống',
        400,
        'LAST_SUPER_ADMIN'
      );
    }
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });
}
