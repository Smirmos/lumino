import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true }); // Don't reveal validation
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return success — don't reveal whether email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/login/reset-password/${token}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Lumino AI <noreply@luminoai.co.il>',
        to: user.email,
        subject: 'Reset your Lumino AI password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #5B4FCF;">Reset Your Password</h2>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}"
               style="background: #5B4FCF; color: white; padding: 12px 24px;
                      border-radius: 6px; text-decoration: none; display: inline-block;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
              If you didn't request this, ignore this email.
            </p>
          </div>
        `,
      });
    } else {
      // Dev mode: log reset URL to console
      console.log(`\n[DEV] Password reset link for ${user.email}:\n${resetUrl}\n`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: true }); // Don't reveal errors
  }
}
