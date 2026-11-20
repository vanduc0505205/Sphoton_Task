import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '../types';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/crypto';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined = undefined;

    if (req.cookies && typeof req.cookies.accessToken === 'string') {
      token = req.cookies.accessToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ', 401, 'TOKEN_EXPIRED');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 401, 'USER_NOT_FOUND');
    }

    if (user.isLocked) {
      throw new AppError('Tài khoản của bạn đã bị khóa bởi quản trị viên', 403, 'ACCOUNT_LOCKED');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.fullName,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền truy cập tài nguyên này', 403, 'FORBIDDEN')
      );
    }

    next();
  };
}
