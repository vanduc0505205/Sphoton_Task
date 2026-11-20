import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/appError';
import { sendError } from '../utils/response';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const pathKey = issue.path.length > 0 ? issue.path.join('.') : 'root';
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = [];
      }
      fieldErrors[pathKey].push(issue.message);
    }
    const firstIssue = err.issues[0];
    const message = firstIssue ? firstIssue.message : 'Dữ liệu đầu vào không hợp lệ';
    return sendError(res, message, 400, fieldErrors);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'Kích thước ảnh tải lên không được vượt quá 2MB', 400);
    }
    return sendError(res, `Lỗi tải tệp tin: ${err.message}`, 400);
  }

  if (err instanceof Error) {
    console.error('[Unhandled Error]:', err.message);
  }

  return sendError(res, 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau', 500);
}
