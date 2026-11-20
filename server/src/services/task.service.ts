import { Prisma, Task, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  AuthenticatedUser,
  PaginatedResult,
  TaskDto,
  TaskPriority,
  TaskStatsDto,
  TaskStatus,
} from '../types';
import { AppError } from '../utils/appError';

type TaskWithOptionalUser = Task & {
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'avatarUrl'>;
};

export function toTaskDto(task: TaskWithOptionalUser): TaskDto {
  const dto: TaskDto = {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };

  if (task.user) {
    dto.user = {
      id: task.user.id,
      fullName: task.user.fullName,
      email: task.user.email,
      avatarUrl: task.user.avatarUrl,
    };
  }

  return dto;
}

export async function listTasks(params: {
  userId?: string;
  includeCreator?: boolean;
  page: number;
  limit: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy: 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}): Promise<PaginatedResult<TaskDto>> {
  const where: Prisma.TaskWhereInput = {};

  if (params.userId) {
    where.userId = params.userId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.priority) {
    where.priority = params.priority;
  }

  if (params.search && params.search.length > 0) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const orderBy: Prisma.TaskOrderByWithRelationInput =
    params.sortBy === 'dueDate'
      ? { dueDate: params.sortOrder }
      : { createdAt: params.sortOrder };

  const [total, records] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: params.limit,
      orderBy,
      include: params.includeCreator
        ? {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          }
        : undefined,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.limit));

  return {
    items: records.map((record) => toTaskDto(record)),
    total,
    page: params.page,
    limit: params.limit,
    totalPages,
  };
}

export async function getTaskStatsForUser(userId: string): Promise<TaskStatsDto> {
  const now = new Date();

  const [total, todo, inProgress, completed, overdue] = await prisma.$transaction([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: 'TODO' } }),
    prisma.task.count({ where: { userId, status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { userId, status: 'DONE' } }),
    prisma.task.count({
      where: {
        userId,
        status: { not: 'DONE' },
        dueDate: { lt: now },
      },
    }),
  ]);

  return {
    total,
    todo,
    inProgress,
    completed,
    overdue,
  };
}

export async function getTaskById(
  taskId: string,
  actor: AuthenticatedUser
): Promise<TaskDto> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Không tìm thấy công việc', 404, 'TASK_NOT_FOUND');
  }

  if (
    task.userId !== actor.id &&
    actor.role !== 'SUPER_ADMIN' &&
    actor.role !== 'ADMIN'
  ) {
    throw new AppError(
      'Bạn không có quyền truy cập công việc của người khác',
      403,
      'FORBIDDEN_TASK_ACCESS'
    );
  }

  return toTaskDto(task);
}

export async function createTaskForUser(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
  }
): Promise<TaskDto> {
  const parsedDueDate =
    input.dueDate !== undefined && input.dueDate !== null && input.dueDate !== ''
      ? new Date(input.dueDate)
      : null;

  const parsedDescription =
    input.description !== undefined && input.description !== null
      ? input.description
      : null;

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: parsedDescription,
      status: input.status,
      priority: input.priority,
      dueDate: parsedDueDate,
    },
  });

  return toTaskDto(task);
}

export async function updateTaskById(
  taskId: string,
  actor: AuthenticatedUser,
  input: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }
): Promise<TaskDto> {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existingTask) {
    throw new AppError('Không tìm thấy công việc', 404, 'TASK_NOT_FOUND');
  }

  if (existingTask.userId !== actor.id && actor.role !== 'SUPER_ADMIN') {
    throw new AppError(
      'Bạn không có quyền chỉnh sửa công việc của người khác',
      403,
      'FORBIDDEN_TASK_UPDATE'
    );
  }

  const updateData: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }
  if (input.dueDate !== undefined) {
    updateData.dueDate =
      input.dueDate !== null && input.dueDate !== '' ? new Date(input.dueDate) : null;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return toTaskDto(updated);
}

export async function deleteTaskById(
  taskId: string,
  actor: AuthenticatedUser
): Promise<void> {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existingTask) {
    throw new AppError('Không tìm thấy công việc', 404, 'TASK_NOT_FOUND');
  }

  if (existingTask.userId !== actor.id && actor.role !== 'SUPER_ADMIN') {
    throw new AppError(
      'Bạn không có quyền xóa công việc của người khác',
      403,
      'FORBIDDEN_TASK_DELETE'
    );
  }

  await prisma.task.delete({
    where: { id: taskId },
  });
}
