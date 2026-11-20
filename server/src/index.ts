import bcrypt from 'bcrypt';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function ensureSuperAdminSeeded(): Promise<void> {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    return;
  }

  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email,
        fullName: env.SUPER_ADMIN_NAME,
        passwordHash,
        role: 'SUPER_ADMIN',
        isEmailVerified: true,
        isLocked: false,
      },
    });
    console.log(`[SphotonTask] Đã khởi tạo tài khoản SUPER_ADMIN mặc định: ${email}`);
  }
}

async function startServer(): Promise<void> {
  try {
    await ensureSuperAdminSeeded();
    app.listen(env.PORT, () => {
      console.log(`[SphotonTask Server] Đang chạy tại http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('[SphotonTask Server] Khởi động thất bại:', err);
    process.exit(1);
  }
}

startServer();
