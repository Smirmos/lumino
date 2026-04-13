import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { Db } from '../db';
import { users, conversations, messages } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MobilePushService } from './mobile-push.service';

@Injectable()
export class EscalationNotifierService {
  private readonly logger = new Logger(EscalationNotifierService.name);
  private readonly emailEnabled: boolean;
  private readonly fromEmail: string;
  private readonly dashboardUrl: string;

  constructor(
    @Inject('DB') private readonly db: Db,
    private readonly config: ConfigService,
    private readonly mobilePush: MobilePushService,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    this.emailEnabled = !!apiKey;
    if (apiKey) sgMail.setApiKey(apiKey);
    this.fromEmail = this.config.get<string>(
      'ESCALATION_FROM_EMAIL',
      'Lumino AI <noreply@luminoai.co.il>',
    );
    this.dashboardUrl = this.config.get<string>(
      'DASHBOARD_URL',
      'https://dashboard.luminoai.co.il',
    );
  }

  async notifyEscalation(
    clientId: string,
    channel: string,
    customerIdentifier: string,
    triggerReason: string,
  ): Promise<void> {
    // Mobile push fires regardless of SendGrid availability — it's an
    // independent channel and shouldn't be coupled to email setup.
    const maskedId = `****${customerIdentifier.slice(-4)}`;
    const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Instagram';

    // Find conversation up-front so push payload can deep-link straight to it.
    const convForPush = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.channel, channel),
          eq(conversations.customerIdentifier, customerIdentifier),
        ),
      )
      .limit(1);
    const conversationIdForPush = convForPush[0]?.id;

    void this.mobilePush.sendToClient(
      clientId,
      `Escalation · ${channelLabel}`,
      `Customer ${maskedId}: ${triggerReason}`,
      conversationIdForPush ? { route: `/conversations/${conversationIdForPush}` } : undefined,
    );

    if (!this.emailEnabled) {
      this.logger.warn('SENDGRID_API_KEY not set — skipping escalation email');
      return;
    }

    try {
      // 1. Find owner email
      const userRows = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.clientId, clientId))
        .limit(1);

      if (userRows.length === 0) {
        this.logger.warn(`No user found for clientId ${clientId} — skipping escalation email`);
        return;
      }
      const ownerEmail = userRows[0].email;

      // 2. Find conversation
      const convRows = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        )
        .limit(1);

      if (convRows.length === 0) {
        this.logger.warn('Conversation not found for escalation email');
        return;
      }
      const conversationId = convRows[0].id;

      // 3. Fetch last 5 messages
      const recentMessages = await this.db
        .select({
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(5);

      // Reverse to chronological order
      recentMessages.reverse();

      // 4. Build email HTML
      const dashboardLink = `${this.dashboardUrl}/dashboard/conversations/${conversationId}`;

      const messagesHtml = recentMessages
        .map((msg) => {
          const roleLabel = msg.role === 'user' ? 'Customer' : 'AI Manager';
          const time = msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          const bgColor = msg.role === 'user' ? '#f3f4f6' : '#f0eefb';
          return `<div style="background:${bgColor};padding:10px 14px;border-radius:8px;margin-bottom:6px;">
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${roleLabel} · ${time}</div>
            <div style="font-size:14px;color:#111;">${msg.content}</div>
          </div>`;
        })
        .join('');

      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#5B4FCF;margin-bottom:4px;">Escalation Alert</h2>
          <p style="color:#6b7280;margin-top:0;">A customer needs your attention.</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Customer</td><td style="padding:6px 0;font-weight:600;">${maskedId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Channel</td><td style="padding:6px 0;">${channelLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Trigger</td><td style="padding:6px 0;">${triggerReason}</td></tr>
          </table>

          <h3 style="margin-bottom:8px;">Recent Messages</h3>
          ${messagesHtml}

          <div style="margin-top:20px;">
            <a href="${dashboardLink}" style="display:inline-block;padding:10px 24px;background:#5B4FCF;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
              View in Dashboard
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
            The AI Manager has stopped responding to this customer. Please follow up directly.
          </p>
        </div>
      `;

      // 5. Send email
      await sgMail.send({
        from: this.fromEmail,
        to: ownerEmail,
        subject: `Escalation: Customer ${maskedId} needs attention`,
        html,
      });

      this.logger.log(`Escalation email sent to ${ownerEmail} for conversation ${conversationId}`);
    } catch (err: any) {
      this.logger.error('Escalation notification error', err.message);
    }
  }
}
