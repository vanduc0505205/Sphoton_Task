import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { testEmailTokenStore } from '../services/email.service';

const testPassword = process.env.DEMO_ACCOUNT_PASSWORD
  ? process.env.DEMO_ACCOUNT_PASSWORD
  : '';
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  ? process.env.SUPER_ADMIN_EMAIL.toLowerCase()
  : '';
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD
  ? process.env.SUPER_ADMIN_PASSWORD
  : '';

describe('SphotonTask Auth, RBAC & Task API Integration Tests', () => {
  const testRunId = Date.now().toString();
  const userOneEmail = `user1.${testRunId}@sphoton.local`;
  const userTwoEmail = `user2.${testRunId}@sphoton.local`;
  const lockoutEmail = `lockout.${testRunId}@sphoton.local`;

  let userOneToken = '';
  let userOneRefreshCookie = '';
  let userOneId = '';
  let userOneTaskId = '';

  let userTwoToken = '';
  let userTwoId = '';

  let superAdminToken = '';
  let superAdminId = '';

  beforeAll(async () => {
    if (!testPassword || !superAdminEmail || !superAdminPassword) {
      throw new Error('Missing required test environment variables in server/.env');
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [userOneEmail, userTwoEmail, lockoutEmail],
        },
      },
    });
    await prisma.$disconnect();
  });

  it('1. Đăng ký tài khoản mới (role USER, chưa xác thực email)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Nhân viên Kiểm thử 1',
      email: userOneEmail,
      password: testPassword,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userOneEmail);
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.isEmailVerified).toBe(false);
    userOneId = res.body.data.user.id;
  });

  it('2. Chặn đăng nhập khi tài khoản chưa xác thực email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: userOneEmail,
      password: testPassword,
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Xác thực email bằng token 1 lần và chặn dùng lại token', async () => {
    const rawVerifyToken = testEmailTokenStore.verificationTokens.get(userOneEmail);
    expect(rawVerifyToken).toBeDefined();

    const verifyRes = await request(app).post('/api/auth/verify-email').send({
      token: rawVerifyToken,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user.isEmailVerified).toBe(true);

    const reuseRes = await request(app).post('/api/auth/verify-email').send({
      token: rawVerifyToken,
    });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.success).toBe(false);
  });

  it('4. Đăng nhập thành công sau khi xác thực email và xoay vòng Refresh Token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: userOneEmail,
      password: testPassword,
      rememberMe: true,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    userOneToken = loginRes.body.data.accessToken;

    const rawCookies = loginRes.headers['set-cookie'];
    const cookiesArray = Array.isArray(rawCookies) ? rawCookies : [String(rawCookies)];
    const refreshCookie = cookiesArray.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    userOneRefreshCookie = refreshCookie ? refreshCookie.split(';')[0] : '';

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userOneToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(userOneEmail);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [userOneRefreshCookie]);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);

    const replayRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [userOneRefreshCookie]);
    expect(replayRefreshRes.status).toBe(401);
  });

  it('5. Khóa tạm tài khoản sau 5 lần đăng nhập sai liên tiếp', async () => {
    await request(app).post('/api/auth/register').send({
      fullName: 'Nhân viên Lockout',
      email: lockoutEmail,
      password: testPassword,
    });
    const token = testEmailTokenStore.verificationTokens.get(lockoutEmail);
    await request(app).post('/api/auth/verify-email').send({ token });

    const wrongPassword = `${testPassword}_wrong`;

    for (let i = 1; i <= 4; i++) {
      const attemptRes = await request(app).post('/api/auth/login').send({
        email: lockoutEmail,
        password: wrongPassword,
      });
      expect(attemptRes.status).toBe(401);
    }

    const fifthAttempt = await request(app).post('/api/auth/login').send({
      email: lockoutEmail,
      password: wrongPassword,
    });
    expect(fifthAttempt.status).toBe(423);

    const validPasswordDuringLock = await request(app).post('/api/auth/login').send({
      email: lockoutEmail,
      password: testPassword,
    });
    expect(validPasswordDuringLock.status).toBe(423);
  });

  it('6. Quản lý Task cá nhân và bảo vệ quyền sở hữu giữa các USER', async () => {
    const createTaskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userOneToken}`)
      .send({
        title: 'Báo cáo KPI quý 4',
        description: 'Hoàn thiện bảng đánh giá KPI cá nhân',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      });

    expect(createTaskRes.status).toBe(201);
    userOneTaskId = createTaskRes.body.data.task.id;

    const statsRes = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${userOneToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats.total).toBe(1);
    expect(statsRes.body.data.stats.inProgress).toBe(1);

    await request(app).post('/api/auth/register').send({
      fullName: 'Nhân viên Kiểm thử 2',
      email: userTwoEmail,
      password: testPassword,
    });
    const token2 = testEmailTokenStore.verificationTokens.get(userTwoEmail);
    const verify2Res = await request(app).post('/api/auth/verify-email').send({ token: token2 });
    userTwoId = verify2Res.body.data.user.id;

    const login2Res = await request(app).post('/api/auth/login').send({
      email: userTwoEmail,
      password: testPassword,
    });
    userTwoToken = login2Res.body.data.accessToken;

    const forbiddenGet = await request(app)
      .get(`/api/tasks/${userOneTaskId}`)
      .set('Authorization', `Bearer ${userTwoToken}`);
    expect(forbiddenGet.status).toBe(403);

    const forbiddenPatch = await request(app)
      .patch(`/api/tasks/${userOneTaskId}`)
      .set('Authorization', `Bearer ${userTwoToken}`)
      .send({ status: 'DONE' });
    expect(forbiddenPatch.status).toBe(403);

    const forbiddenDelete = await request(app)
      .delete(`/api/tasks/${userOneTaskId}`)
      .set('Authorization', `Bearer ${userTwoToken}`);
    expect(forbiddenDelete.status).toBe(403);
  });

  it('7. Kiểm tra phân quyền RBAC giữa USER, ADMIN và SUPER_ADMIN', async () => {
    const userAdminAccess = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userOneToken}`);
    expect(userAdminAccess.status).toBe(403);

    const saLoginRes = await request(app).post('/api/auth/login').send({
      email: superAdminEmail,
      password: superAdminPassword,
    });
    expect(saLoginRes.status).toBe(200);
    superAdminToken = saLoginRes.body.data.accessToken;
    superAdminId = saLoginRes.body.data.user.id;

    const promoteRes = await request(app)
      .patch(`/api/admin/users/${userTwoId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'ADMIN' });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.user.role).toBe('ADMIN');

    const adminListUsers = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userTwoToken}`);
    expect(adminListUsers.status).toBe(200);

    const adminChangeRoleAttempt = await request(app)
      .patch(`/api/admin/users/${userOneId}/role`)
      .set('Authorization', `Bearer ${userTwoToken}`)
      .send({ role: 'ADMIN' });
    expect(adminChangeRoleAttempt.status).toBe(403);

    const adminEditOtherTaskAttempt = await request(app)
      .patch(`/api/tasks/${userOneTaskId}`)
      .set('Authorization', `Bearer ${userTwoToken}`)
      .send({ status: 'DONE' });
    expect(adminEditOtherTaskAttempt.status).toBe(403);

    const selfDemoteAttempt = await request(app)
      .patch(`/api/admin/users/${superAdminId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'USER' });
    expect(selfDemoteAttempt.status).toBe(400);

    const selfDeleteAttempt = await request(app)
      .delete(`/api/admin/users/${superAdminId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(selfDeleteAttempt.status).toBe(400);
  });
});
