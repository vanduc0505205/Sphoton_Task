import { Router } from 'express';
import {
  handleChangePassword,
  handleForgotPassword,
  handleGetMe,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleVerifyEmail,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
} from '../middlewares/rateLimit.middleware';

export const authRouter = Router();

authRouter.post('/register', registerRateLimiter, handleRegister);
authRouter.post('/verify-email', handleVerifyEmail);
authRouter.post('/resend-verification', registerRateLimiter, handleResendVerification);
authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/refresh', handleRefresh);
authRouter.post('/logout', handleLogout);
authRouter.post('/forgot-password', passwordResetRateLimiter, handleForgotPassword);
authRouter.post('/reset-password', handleResetPassword);
authRouter.get('/me', authenticate, handleGetMe);
authRouter.patch('/change-password', authenticate, handleChangePassword);
