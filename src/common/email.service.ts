import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    this.enabled = !!apiKey;
    if (apiKey) sgMail.setApiKey(apiKey);
    this.fromEmail = this.config.get<string>('EMAIL_FROM', 'Lumino AI <noreply@luminoai.co.il>');
  }

  async sendWelcomeEmail(email: string, businessName: string, dashboardUrl: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('SENDGRID_API_KEY not set — skipping welcome email');
      return;
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#5B4FCF;">Welcome to Lumino AI!</h2>
        <p>Hi there,</p>
        <p>Your account for <strong>${businessName}</strong> has been created. You can now access your dashboard to manage your AI chatbot.</p>

        <div style="margin:24px 0;">
          <a href="${dashboardUrl}/login"
             style="display:inline-block;padding:12px 32px;background:#5B4FCF;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
            Go to Dashboard
          </a>
        </div>

        <p>Please set your password by clicking the link below:</p>
        <div style="margin:16px 0;">
          <a href="${dashboardUrl}/login/forgot-password"
             style="display:inline-block;padding:10px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:8px;font-weight:500;">
            Set Your Password
          </a>
        </div>

        <p style="color:#6b7280;font-size:14px;margin-top:24px;">
          If you have any questions, reply to this email or contact your account manager.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;">Lumino AI — AI-powered customer service for your business</p>
      </div>
    `;

    try {
      await sgMail.send({
        from: this.fromEmail,
        to: email,
        subject: `Welcome to Lumino AI — ${businessName}`,
        html,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send welcome email to ${email}`, err.message);
      throw err;
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('SENDGRID_API_KEY not set — skipping password reset email');
      console.log(`\n[DEV] Password reset link for ${email}:\n${resetUrl}\n`);
      return;
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;">
        <h2 style="color:#5B4FCF;">Reset Your Password</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <div style="margin:24px 0;">
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#5B4FCF;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
            Reset Password
          </a>
        </div>
        <p style="color:#666;font-size:14px;">If you didn't request this, ignore this email.</p>
      </div>
    `;

    try {
      await sgMail.send({
        from: this.fromEmail,
        to: email,
        subject: 'Reset your Lumino AI password',
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${email}`, err.message);
      throw err;
    }
  }
}
