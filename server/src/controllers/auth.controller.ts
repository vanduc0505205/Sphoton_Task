import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import {
  changeUserPassword,
  getUserProfile,
  loginUser,
  logoutUserSession,
  refreshUserSession,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetUserPassword,
  verifyUserEmail,
} from '../services/auth.service';
import { AppError } from '../utils/appError';
import { sendSuccess } from '../utils/response';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date
): void {
  const isProd = env.NODE_ENV === 'production';
  const refreshMaxAge = Math.max(0, refreshExpiresAt.getTime() - Date.now());

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

export async function handleRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    sendSuccess(
      res,
      { user },
      'Đăng ký tài khoản thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = verifyEmailSchema.parse(req.body);
    const user = await verifyUserEmail(input.token);
    sendSuccess(res, { user }, 'Xác thực địa chỉ email thành công. Bạn có thể đăng nhập ngay.');
  } catch (err) {
    next(err);
  }
}

export async function handleResendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = resendVerificationSchema.parse(req.body);
    await resendVerificationEmail(input.email);
    sendSuccess(
      res,
      null,
      'Nếu tài khoản tồn tại và chưa xác thực, liên kết xác thực mới đã được gửi tới email của bạn.'
    );
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser({
      email: input.email,
      password: input.password,
      rememberMe: input.rememberMe,
    });

    setAuthCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Đăng nhập thành công'
    );
  } catch (err) {
    next(err);
  }
}

export async function handleRefresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let rawRefreshToken = '';
    if (req.cookies && typeof req.cookies.refreshToken === 'string') {
      rawRefreshToken = req.cookies.refreshToken;
    } else if (req.body && typeof req.body.refreshToken === 'string') {
      rawRefreshToken = req.body.refreshToken;
    }

    const result = await refreshUserSession(rawRefreshToken);

    setAuthCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Làm mới phiên đăng nhập thành công'
    );
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
}

export async function handleLogout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefreshToken =
      req.cookies && typeof req.cookies.refreshToken === 'string'
        ? req.cookies.refreshToken
        : undefined;

    await logoutUserSession(rawRefreshToken);
    clearAuthCookies(res);

    sendSuccess(res, null, 'Đăng xuất thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(input.email);
    sendSuccess(
      res,
      null,
      'Nếu địa chỉ email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'
    );
  } catch (err) {
    next(err);
  }
}

export async function handleResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await resetUserPassword(input.token, input.password);
    clearAuthCookies(res);
    sendSuccess(
      res,
      null,
      'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
    );
  } catch (err) {
    next(err);
  }
}

export async function handleGetMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }
    const user = await getUserProfile(req.user.id);
    sendSuccess(res, { user }, 'Lấy thông tin người dùng thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }
    const input = changePasswordSchema.parse(req.body);
    await changeUserPassword(req.user.id, input.currentPassword, input.newPassword);
    sendSuccess(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    next(err);
  }
}
