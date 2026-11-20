import { NextFunction, Request, Response } from 'express';
import {
  changeUserRole,
  deleteUserById,
  listUsersForAdmin,
  toggleUserLock,
  updateProfileAvatar,
  updateProfileFullName,
} from '../services/user.service';
import { AppError } from '../utils/appError';
import { sendSuccess } from '../utils/response';
import {
  adminUserQuerySchema,
  updateProfileSchema,
  updateUserLockSchema,
  updateUserRoleSchema,
} from '../validators/user.validator';

export async function handleUpdateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const input = updateProfileSchema.parse(req.body);
    const user = await updateProfileFullName(req.user.id, input.fullName);
    sendSuccess(res, { user }, 'Cập nhật thông tin hồ sơ thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleUploadAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    if (!req.file) {
      throw new AppError('Vui lòng chọn tệp ảnh đại diện', 400, 'MISSING_FILE');
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await updateProfileAvatar(req.user.id, avatarUrl);
    sendSuccess(res, { user }, 'Cập nhật ảnh đại diện thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleGetAdminUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = adminUserQuerySchema.parse(req.query);
    const result = await listUsersForAdmin({
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
      status: query.status,
    });
    sendSuccess(res, result, 'Lấy danh sách người dùng thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleChangeUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const targetUserId = String(req.params.id);
    const input = updateUserRoleSchema.parse(req.body);
    const user = await changeUserRole(targetUserId, input.role, req.user.id);
    sendSuccess(res, { user }, 'Cập nhật vai trò người dùng thành công');
  } catch (err) {
    next(err);
  }
}

export async function handleToggleUserLock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const targetUserId = String(req.params.id);
    const input = updateUserLockSchema.parse(req.body);
    const user = await toggleUserLock(targetUserId, input.isLocked, req.user.id);
    const message = input.isLocked
      ? 'Đã khóa tài khoản người dùng'
      : 'Đã mở khóa tài khoản người dùng';
    sendSuccess(res, { user }, message);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'UNAUTHORIZED');
    }

    const targetUserId = String(req.params.id);
    await deleteUserById(targetUserId, req.user.id);
    sendSuccess(res, null, 'Đã xóa tài khoản người dùng thành công');
  } catch (err) {
    next(err);
  }
}
