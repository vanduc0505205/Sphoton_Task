import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface TestTokenStore {
  verificationTokens: Map<string, string>;
  passwordResetTokens: Map<string, string>;
}

export const testEmailTokenStore: TestTokenStore = {
  verificationTokens: new Map<string, string>(),
  passwordResetTokens: new Map<string, string>(),
};

function createTransporter() {
  const hasAuth = Boolean(
    env.SMTP_USER &&
      env.SMTP_PASS &&
      !env.SMTP_USER.startsWith('YOUR_') &&
      !env.SMTP_PASS.startsWith('YOUR_')
  );

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: hasAuth
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });
}

export async function sendVerificationEmail(
  toEmail: string,
  fullName: string,
  rawToken: string
): Promise<string> {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(toEmail)}`;
  testEmailTokenStore.verificationTokens.set(toEmail.toLowerCase(), rawToken);

  if (env.NODE_ENV !== 'production') {
    console.log('\n======================================================');
    console.log(`[SphotonTask Email] Xác thực tài khoản cho: ${toEmail}`);
    console.log(`[Verify Link]: ${verifyUrl}`);
    console.log('======================================================\n');
  }

  if (env.NODE_ENV === 'test') {
    return verifyUrl;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: '[SphotonTask] Xác thực địa chỉ email của bạn',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Chào mừng ${fullName} đến với SphotonTask!</h2>
          <p style="color: #374151; line-height: 1.6;">Vui lòng nhấn vào nút bên dưới để xác thực địa chỉ email của bạn. Liên kết có hiệu lực trong vòng <strong>24 giờ</strong>.</p>
          <div style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Xác thực Email ngay</a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Hoặc sao chép đường dẫn sau vào trình duyệt:<br/><a href="${verifyUrl}" style="color: #4f46e5;">${verifyUrl}</a></p>
        </div>
      `,
    });
  } catch (err: unknown) {
    if (env.NODE_ENV === 'development') {
      console.warn(
        '[SphotonTask Email] Không kết nối được SMTP cục bộ (Mailpit/Ethereal), vui lòng sử dụng đường dẫn đã in trên console.'
      );
    } else {
      throw err;
    }
  }

  return verifyUrl;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  fullName: string,
  rawToken: string
): Promise<string> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(toEmail)}`;
  testEmailTokenStore.passwordResetTokens.set(toEmail.toLowerCase(), rawToken);

  if (env.NODE_ENV !== 'production') {
    console.log('\n======================================================');
    console.log(`[SphotonTask Email] Đặt lại mật khẩu cho: ${toEmail}`);
    console.log(`[Reset Password Link]: ${resetUrl}`);
    console.log('======================================================\n');
  }

  if (env.NODE_ENV === 'test') {
    return resetUrl;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: '[SphotonTask] Yêu cầu đặt lại mật khẩu',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Xin chào ${fullName},</h2>
          <p style="color: #374151; line-height: 1.6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản SphotonTask của bạn. Liên kết này có hiệu lực trong vòng <strong>30 phút</strong> và chỉ sử dụng được 1 lần.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Đặt lại mật khẩu</a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Hoặc sao chép đường dẫn sau vào trình duyệt:<br/><a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
        </div>
      `,
    });
  } catch (err: unknown) {
    if (env.NODE_ENV === 'development') {
      console.warn(
        '[SphotonTask Email] Không kết nối được SMTP cục bộ (Mailpit/Ethereal), vui lòng sử dụng đường dẫn đã in trên console.'
      );
    } else {
      throw err;
    }
  }

  return resetUrl;
}
