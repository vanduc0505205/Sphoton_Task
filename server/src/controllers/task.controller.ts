import { NextFunction, Request, Response } from 'express';
import {
  createTaskForUser,
  deleteTaskById,
  getTaskById,
  getTaskStatsForUser,
  listTasks,
  updateTaskById,
} from '../services/task.service';
import { AppError } from '../utils/appError';
import { sendSuccess } from '../utils/response';
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from '../validators/task.validator';

export async function handleGetMyTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const query = taskQuerySchema.parse(req.query);
    const result = await listTasks({
      userId: req.user.id,
      includeCreator: false,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      priority: query.priority,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    sendSuccess(res, result, 'Lấy danh sách công việc thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleGetMyTaskStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const stats = await getTaskStatsForUser(req.user.id);
    sendSuccess(res, { stats }, 'Lấy thống kê công việc thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleGetTaskById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const taskId = String(req.params.id);
    const task = await getTaskById(taskId, req.user);
    sendSuccess(res, { task }, 'Lấy chi tiết công việc thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleCreateTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const input = createTaskSchema.parse(req.body);
    const task = await createTaskForUser(req.user.id, input);
    sendSuccess(res, { task }, 'Tạo công việc mới thành công', 201);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const taskId = String(req.params.id);
    const input = updateTaskSchema.parse(req.body);
    const task = await updateTaskById(taskId, req.user, input);
    sendSuccess(res, { task }, 'Cập nhật công việc thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const taskId = String(req.params.id);
    await deleteTaskById(taskId, req.user);
    sendSuccess(res, null, 'Xóa công việc thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleGetAdminTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = taskQuerySchema.parse(req.query);
    const result = await listTasks({
      includeCreator: true,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      priority: query.priority,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    sendSuccess(res, result, 'Lấy danh sách toàn bộ công việc thành công');
  } catch (err) {
    next(err);
  }
}
