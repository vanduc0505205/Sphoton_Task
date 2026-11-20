import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

dotenv.config();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const superAdminName = process.env.SUPER_ADMIN_NAME
    ? process.env.SUPER_ADMIN_NAME
    : 'Quản trị viên cấp cao';

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      'Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in environment variables (.env)'
    );
  }

  const saltRounds = 10;
  const superAdminHash = await bcrypt.hash(superAdminPassword, saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail.toLowerCase() },
    update: {
      fullName: superAdminName,
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      isLocked: false,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email: superAdminEmail.toLowerCase(),
      fullName: superAdminName,
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      isLocked: false,
    },
  });

  console.log(`Seeded SUPER_ADMIN: ${superAdmin.email}`);

  const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL;
  const demoUserEmail = process.env.DEMO_USER_EMAIL;
  const demoAccountPassword = process.env.DEMO_ACCOUNT_PASSWORD;

  if (demoAdminEmail && demoUserEmail && demoAccountPassword) {
    const demoHash = await bcrypt.hash(demoAccountPassword, saltRounds);

    const demoAdmin = await prisma.user.upsert({
      where: { email: demoAdminEmail.toLowerCase() },
      update: {
        fullName: 'Trưởng phòng Nhân sự',
        passwordHash: demoHash,
        role: 'ADMIN',
        isEmailVerified: true,
        isLocked: false,
      },
      create: {
        email: demoAdminEmail.toLowerCase(),
        fullName: 'Trưởng phòng Nhân sự',
        passwordHash: demoHash,
        role: 'ADMIN',
        isEmailVerified: true,
        isLocked: false,
      },
    });

    const demoUser = await prisma.user.upsert({
      where: { email: demoUserEmail.toLowerCase() },
      update: {
        fullName: 'Nguyễn Văn Minh',
        passwordHash: demoHash,
        role: 'USER',
        isEmailVerified: true,
        isLocked: false,
      },
      create: {
        email: demoUserEmail.toLowerCase(),
        fullName: 'Nguyễn Văn Minh',
        passwordHash: demoHash,
        role: 'USER',
        isEmailVerified: true,
        isLocked: false,
      },
    });

    const existingTasksCount = await prisma.task.count();
    if (existingTasksCount === 0) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await prisma.task.createMany({
        data: [
          {
            userId: superAdmin.id,
            title: 'Rà soát chính sách phân quyền bảo mật Quý 4',
            description: 'Kiểm tra quyền hạn truy cập của các phòng ban trên hệ thống SphotonTask.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: tomorrow,
          },
          {
            userId: superAdmin.id,
            title: 'Phê duyệt kế hoạch tuyển dụng kỹ sư Full-stack',
            description: 'Xem xét hồ sơ ứng viên vòng phỏng vấn kỹ thuật và chốt chỉ tiêu nhân sự.',
            status: 'TODO',
            priority: 'MEDIUM',
            dueDate: inThreeDays,
          },
          {
            userId: demoAdmin.id,
            title: 'Tổng hợp báo cáo hiệu suất làm việc tháng 11',
            description: 'Thu thập số liệu hoàn thành công việc của toàn bộ thành viên trong công ty.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: inThreeDays,
          },
          {
            userId: demoUser.id,
            title: 'Hoàn thiện tài liệu hướng dẫn hội nhập nhân viên mới',
            description: 'Cập nhật quy trình onboarding và tài liệu văn hóa doanh nghiệp Sphoton.',
            status: 'DONE',
            priority: 'MEDIUM',
            dueDate: yesterday,
          },
          {
            userId: demoUser.id,
            title: 'Cập nhật hồ sơ năng lực cá nhân trên hệ thống',
            description: 'Bổ sung các chứng chỉ chuyên môn và mục tiêu phát triển cá nhân quý tới.',
            status: 'TODO',
            priority: 'LOW',
            dueDate: inSevenDays,
          },
          {
            userId: demoUser.id,
            title: 'Gửi báo cáo tiến độ dự án tuần cho quản lý',
            description: 'Tổng hợp các đầu việc đã xử lý và các vướng mắc cần hỗ trợ.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: yesterday,
          },
        ],
      });
      console.log('Seeded demo users and initial tasks.');
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
