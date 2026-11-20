import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { taskRouter } from './routes/task.routes';
import { profileRouter } from './routes/profile.routes';
import { adminRouter } from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';
import { sendError, sendSuccess } from './utils/response';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }, 'SphotonTask API đang hoạt động');
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);

app.use((_req, res) => {
  sendError(res, 'Không tìm thấy đường dẫn API yêu cầu', 404);
});

app.use(errorHandler);
