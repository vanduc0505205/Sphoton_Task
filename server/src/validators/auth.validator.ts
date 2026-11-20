import { z } from 'zod';

export const passwordPolicySchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số');

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không vượt quá 100 ký tự'),
  email: z
    .string()
    .trim()
    .email('Địa chỉ email không hợp lệ')
    .transform((val) => val.toLowerCase()),
  password: passwordPolicySchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(10, 'Mã xác thực không hợp lệ'),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Địa chỉ email không hợp lệ')
    .transform((val) => val.toLowerCase()),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Địa chỉ email không hợp lệ')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean().optional().default(true),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Địa chỉ email không hợp lệ')
    .transform((val) => val.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Mã đặt lại mật khẩu không hợp lệ'),
  password: passwordPolicySchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: passwordPolicySchema,
});
