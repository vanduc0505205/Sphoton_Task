import { Router } from 'express';
import {
  handleCreateTask,
  handleDeleteTask,
  handleGetMyTasks,
  handleGetMyTaskStats,
  handleGetTaskById,
  handleUpdateTask,
} from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get('/stats', handleGetMyTaskStats);
taskRouter.get('/', handleGetMyTasks);
taskRouter.get('/:id', handleGetTaskById);
taskRouter.post('/', handleCreateTask);
taskRouter.patch('/:id', handleUpdateTask);
taskRouter.delete('/:id', handleDeleteTask);
