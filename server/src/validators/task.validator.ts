import { z } from 'zod';

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề công việc không được để trống')
    .max(200, 'Tiêu đề công việc không vượt quá 200 ký tự'),
  description: z
    .string()
    .trim()
    .max(2000, 'Mô tả không vượt quá 2000 ký tự')
    .nullable()
    .optional(),
  status: taskStatusEnum.optional().default('TODO'),
  priority: taskPriorityEnum.optional().default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề công việc không được để trống')
    .max(200, 'Tiêu đề công việc không vượt quá 200 ký tự')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Mô tả không vượt quá 2000 ký tự')
    .nullable()
    .optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()).nullable().optional(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  sortBy: z.enum(['dueDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
