import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser, UserRole } from '../types';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

export function generateRandomToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function signAccessToken(user: AuthenticatedUser): string {
  const payload: JwtAccessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string, rememberMe: boolean = true): {
  token: string;
  expiresAt: Date;
} {
  const jti = crypto.randomUUID();
  const payload: JwtRefreshPayload = {
    sub: userId,
    jti,
  };
  const days = rememberMe ? 7 : 1;
  const expiresInSeconds = days * 24 * 60 * 60;
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
}
