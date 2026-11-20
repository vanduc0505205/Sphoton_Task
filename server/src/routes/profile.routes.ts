import { Router } from 'express';
import {
  handleUpdateProfile,
  handleUploadAvatar,
} from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadAvatarMiddleware } from '../middlewares/upload.middleware';

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.patch('/', handleUpdateProfile);
profileRouter.post(
  '/avatar',
  uploadAvatarMiddleware.single('avatar'),
  handleUploadAvatar
);
