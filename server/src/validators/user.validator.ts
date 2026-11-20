import { z } from 'zod';

export const userRoleEnum = z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']);

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không vượt quá 100 ký tự'),
});

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: userRoleEnum.optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'UNVERIFIED']).optional(),
});

export const updateUserRoleSchema = z.object({
  role: userRoleEnum,
});

export const updateUserLockSchema = z.object({
  isLocked: z.boolean(),
});
