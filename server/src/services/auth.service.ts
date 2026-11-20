import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { SafeUserDto, UserRole } from '../types';
import { AppError } from '../utils/appError';
import {
  generateRandomToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/crypto';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service';

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_VERIFY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function toSafeUserDto(user: User): SafeUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role as UserRole,
    isEmailVerified: user.isEmailVerified,
    isLocked: user.isLocked,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<SafeUserDto> {
  const normalizedEmail = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError('Địa chỉ email này đã được đăng ký', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const rawVerifyToken = generateRandomToken(32);
  const tokenHash = hashToken(rawVerifyToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_DURATION_MS);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
      isEmailVerified: false,
      verificationTokens: {
        create: {
          tokenHash,
          expiresAt,
        },
      },
    },
  });

  await sendVerificationEmail(user.email, user.fullName, rawVerifyToken);

  return toSafeUserDto(user);
}

export async function verifyUserEmail(rawToken: string): Promise<SafeUserDto> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt !== null) {
    throw new AppError(
      'Liên kết xác thực không hợp lệ hoặc đã được sử dụng',
      400,
      'INVALID_VERIFICATION_TOKEN'
    );
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(
      'Liên kết xác thực đã hết hạn (quá 24 giờ). Vui lòng yêu cầu gửi lại email xác thực.',
      400,
      'VERIFICATION_TOKEN_EXPIRED'
    );
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    }),
  ]);

  return toSafeUserDto(updatedUser);
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return;
  }

  if (user.isEmailVerified) {
    throw new AppError('Tài khoản này đã được xác thực email trước đó', 400, 'ALREADY_VERIFIED');
  }

  const rawVerifyToken = generateRandomToken(32);
  const tokenHash = hashToken(rawVerifyToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_DURATION_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendVerificationEmail(user.email, user.fullName, rawVerifyToken);
}

export async function loginUser(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<{
  user: SafeUserDto;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}> {
  const normalizedEmail = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError('Email hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
  }

  if (user.isLocked) {
    throw new AppError(
      'Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ bộ phận nhân sự.',
      403,
      'ACCOUNT_LOCKED'
    );
  }

  const now = new Date();
  if (user.lockUntil && user.lockUntil > now) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - now.getTime()) / 60000);
    throw new AppError(
      `Tài khoản đang bị khóa tạm thời do đăng nhập sai quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      423,
      'TEMP_LOCKED'
    );
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    const baseAttempts = user.lockUntil && user.lockUntil <= now ? 0 : user.failedLoginAttempts;
    const nextAttempts = baseAttempts + 1;

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lockUntil,
        },
      });
      throw new AppError(
        'Tài khoản đã bị khóa tạm thời 15 phút do đăng nhập sai 5 lần liên tiếp.',
        423,
        'TEMP_LOCKED'
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextAttempts,
        lockUntil: null,
      },
    });

    const remainingTries = MAX_FAILED_ATTEMPTS - nextAttempts;
    throw new AppError(
      `Email hoặc mật khẩu không chính xác. Còn ${remainingTries} lần thử trước khi khóa tạm thời.`,
      401,
      'INVALID_CREDENTIALS'
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      'Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư hoặc nhấn gửi lại email xác thực.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });

  const accessToken = signAccessToken({
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role as UserRole,
    fullName: updatedUser.fullName,
  });

  const { token: refreshToken, expiresAt: refreshExpiresAt } = signRefreshToken(
    updatedUser.id,
    input.rememberMe
  );

  await prisma.refreshToken.create({
    data: {
      userId: updatedUser.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    user: toSafeUserDto(updatedUser),
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
}

export async function refreshUserSession(rawRefreshToken: string): Promise<{
  user: SafeUserDto;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}> {
  if (!rawRefreshToken) {
    throw new AppError('Không tìm thấy phiên đăng nhập', 401, 'MISSING_REFRESH_TOKEN');
  }

  try {
    verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401, 'INVALID_REFRESH_TOKEN');
  }

  const currentHash = hashToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: currentHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt !== null || storedToken.expiresAt < new Date()) {
    throw new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.user.isLocked) {
    throw new AppError('Tài khoản của bạn đã bị khóa', 403, 'ACCOUNT_LOCKED');
  }

  const accessToken = signAccessToken({
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role as UserRole,
    fullName: storedToken.user.fullName,
  });

  const { token: nextRefreshToken, expiresAt: refreshExpiresAt } = signRefreshToken(
    storedToken.user.id,
    true
  );

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: refreshExpiresAt,
      },
    }),
  ]);

  return {
    user: toSafeUserDto(storedToken.user),
    accessToken,
    refreshToken: nextRefreshToken,
    refreshExpiresAt,
  };
}

export async function logoutUserSession(rawRefreshToken?: string): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const currentHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: currentHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.isLocked) {
    return;
  }

  const rawResetToken = generateRandomToken(32);
  const tokenHash = hashToken(rawResetToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendPasswordResetEmail(user.email, user.fullName, rawResetToken);
}

export async function resetUserPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetRecord || resetRecord.usedAt !== null) {
    throw new AppError(
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng',
      400,
      'INVALID_RESET_TOKEN'
    );
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new AppError(
      'Liên kết đặt lại mật khẩu đã hết hạn (quá 30 phút). Vui lòng gửi lại yêu cầu mới.',
      400,
      'RESET_TOKEN_EXPIRED'
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw new AppError('Mật khẩu hiện tại không chính xác', 400, 'INVALID_CURRENT_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function getUserProfile(userId: string): Promise<SafeUserDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Không tìm thấy thông tin người dùng', 404, 'USER_NOT_FOUND');
  }

  return toSafeUserDto(user);
}
