import { Router } from 'express';
import { handleGetAdminTasks } from '../controllers/task.controller';
import {
  handleChangeUserRole,
  handleDeleteUser,
  handleGetAdminUsers,
  handleToggleUserLock,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.get('/users', authorize('SUPER_ADMIN', 'ADMIN'), handleGetAdminUsers);
adminRouter.patch('/users/:id/role', authorize('SUPER_ADMIN'), handleChangeUserRole);
adminRouter.patch('/users/:id/lock', authorize('SUPER_ADMIN'), handleToggleUserLock);
adminRouter.delete('/users/:id', authorize('SUPER_ADMIN'), handleDeleteUser);

adminRouter.get('/tasks', authorize('SUPER_ADMIN', 'ADMIN'), handleGetAdminTasks);
