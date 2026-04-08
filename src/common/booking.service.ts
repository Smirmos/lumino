import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { and, eq, gte, lt, sql, inArray } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import { Db } from '../db';
import { appointments, clientConfigs, users, conversations } from '../db/schema';

interface CreateBookingInput {
  clientId: string;
  conversationId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service?: string;
  startTime: string; // ISO datetime
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly emailEnabled: boolean;
  private readonly fromEmail: string;
  private readonly dashboardUrl: string;

  constructor(
    @Inject('DB') private readonly db: Db,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    this.emailEnabled = !!apiKey;
    if (apiKey) sgMail.setApiKey(apiKey);
    this.fromEmail = this.config.get<string>('ESCALATION_FROM_EMAIL', 'Lumino AI <noreply@luminoai.co.il>');
    this.dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'https://dashboard.luminoai.co.il');
  }

  async createBooking(input: CreateBookingInput): Promise<BookingResult> {
    try {
      // 1. Fetch client config for slot duration
      const [clientConfig] = await this.db
        .select({
          slotDurationMinutes: clientConfigs.slotDurationMinutes,
          maxConcurrentBookings: clientConfigs.maxConcurrentBookings,
          businessName: clientConfigs.businessName,
        })
        .from(clientConfigs)
        .where(eq(clientConfigs.id, input.clientId))
        .limit(1);

      if (!clientConfig) return { success: false, error: 'Client not found' };

      const duration = clientConfig.slotDurationMinutes ?? 60;
      const maxConcurrent = clientConfig.maxConcurrentBookings ?? 1;
      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // 2. Check slot availability (count overlapping pending/confirmed)
      const [{ count }] = await this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, input.clientId),
            inArray(appointments.status, ['pending', 'confirmed']),
            lt(appointments.startTime, endTime),
            gte(appointments.endTime, startTime),
          ),
        );

      if (count >= maxConcurrent) {
        return { success: false, error: 'Slot is no longer available' };
      }

      // 3. Create appointment
      const actionToken = randomUUID();
      const [appointment] = await this.db.insert(appointments).values({
        clientId: input.clientId,
        conversationId: input.conversationId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        service: input.service || null,
        startTime,
        endTime,
        status: 'pending',
        actionToken,
        actionTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      }).returning({ id: appointments.id });

      // 4. Send owner notification email
      await this.notifyOwner(input.clientId, {
        appointmentId: appointment.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        service: input.service,
        startTime,
        endTime,
        actionToken,
        businessName: clientConfig.businessName,
      });

      this.logger.log({
        event: 'booking_created',
        appointmentId: appointment.id,
        clientId: input.clientId,
        startTime: startTime.toISOString(),
      });

      return { success: true, appointmentId: appointment.id };
    } catch (err: any) {
      this.logger.error({ event: 'booking_create_failed', error: err.message });
      return { success: false, error: err.message };
    }
  }

  async confirmBooking(appointmentId: string): Promise<boolean> {
    const [updated] = await this.db
      .update(appointments)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.status, 'pending')))
      .returning();

    if (!updated) return false;

    this.logger.log({ event: 'booking_confirmed', appointmentId });
    return true;
  }

  async declineBooking(appointmentId: string, reason?: string): Promise<boolean> {
    const [updated] = await this.db
      .update(appointments)
      .set({ status: 'declined', declineReason: reason || null, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.status, 'pending')))
      .returning();

    if (!updated) return false;

    this.logger.log({ event: 'booking_declined', appointmentId });
    return true;
  }

  async cancelBooking(appointmentId: string): Promise<boolean> {
    const [updated] = await this.db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          inArray(appointments.status, ['pending', 'confirmed']),
        ),
      )
      .returning();

    if (!updated) return false;

    this.logger.log({ event: 'booking_cancelled', appointmentId });
    return true;
  }

  async getByActionToken(token: string) {
    const [appointment] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.actionToken, token))
      .limit(1);

    return appointment || null;
  }

  private async notifyOwner(
    clientId: string,
    data: {
      appointmentId: string;
      customerName: string;
      customerEmail: string;
      service?: string;
      startTime: Date;
      endTime: Date;
      actionToken: string;
      businessName: string;
    },
  ): Promise<void> {
    if (!this.emailEnabled) {
      this.logger.warn('SENDGRID_API_KEY not set — skipping booking notification');
      return;
    }

    // Find owner email
    const [user] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.clientId, clientId))
      .limit(1);

    if (!user) return;

    const acceptUrl = `${this.dashboardUrl}/booking-action?token=${data.actionToken}&action=accept`;
    const declineUrl = `${this.dashboardUrl}/booking-action?token=${data.actionToken}&action=decline`;

    const dateStr = data.startTime.toLocaleDateString('en-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = data.startTime.toLocaleTimeString('en-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#5B4FCF;margin-bottom:4px;">New Booking Request</h2>
        <p style="color:#6b7280;margin-top:0;">A customer wants to book an appointment.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:130px;">Customer</td><td style="padding:8px 0;font-weight:600;">${data.customerName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;">${data.customerEmail}</td></tr>
          ${data.service ? `<tr><td style="padding:8px 0;color:#6b7280;">Service</td><td style="padding:8px 0;">${data.service}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;font-weight:600;">${timeStr}</td></tr>
        </table>

        <div style="margin-top:20px;display:flex;gap:12px;">
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Accept
          </a>
          <a href="${declineUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin-left:12px;">
            Decline
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
          This link expires in 48 hours. You can also manage bookings from your dashboard.
        </p>
      </div>
    `;

    try {
      await sgMail.send({
        from: this.fromEmail,
        to: user.email,
        subject: `Booking Request: ${data.customerName} — ${dateStr} at ${timeStr}`,
        html,
      });

      await this.db
        .update(appointments)
        .set({ ownerNotifiedAt: new Date() })
        .where(eq(appointments.id, data.appointmentId));

      this.logger.log(`Booking notification sent to ${user.email}`);
    } catch (err: any) {
      this.logger.error('Failed to send booking notification', err.message);
    }
  }

  async notifyCustomer(
    appointmentId: string,
    action: 'confirmed' | 'declined',
  ): Promise<void> {
    if (!this.emailEnabled) return;

    const [appt] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appt) return;

    const [clientConfig] = await this.db
      .select({ businessName: clientConfigs.businessName })
      .from(clientConfigs)
      .where(eq(clientConfigs.id, appt.clientId))
      .limit(1);

    const businessName = clientConfig?.businessName ?? 'the business';
    const dateStr = appt.startTime!.toLocaleDateString('en-IL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const timeStr = appt.startTime!.toLocaleTimeString('en-IL', {
      hour: '2-digit', minute: '2-digit',
    });

    const subject = action === 'confirmed'
      ? `Appointment Confirmed — ${dateStr} at ${timeStr}`
      : `Appointment Update — ${businessName}`;

    const html = action === 'confirmed'
      ? `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#16a34a;">Appointment Confirmed!</h2>
          <p>Your appointment with <strong>${businessName}</strong> has been confirmed.</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            ${appt.service ? `<tr><td style="padding:6px 0;color:#6b7280;width:100px;">Service</td><td style="padding:6px 0;font-weight:600;">${appt.service}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${dateStr}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${timeStr}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px;">If you need to cancel, please contact the business directly.</p>
        </div>`
      : `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#dc2626;">Appointment Update</h2>
          <p>Unfortunately, <strong>${businessName}</strong> was unable to accommodate your appointment request for ${dateStr} at ${timeStr}.</p>
          ${appt.declineReason ? `<p style="color:#6b7280;">Reason: ${appt.declineReason}</p>` : ''}
          <p>Please try booking a different time or contact the business directly.</p>
        </div>`;

    try {
      await sgMail.send({
        from: this.fromEmail,
        to: appt.customerEmail,
        subject,
        html,
      });

      await this.db
        .update(appointments)
        .set({ customerNotifiedAt: new Date() })
        .where(eq(appointments.id, appointmentId));
    } catch (err: any) {
      this.logger.error('Failed to send customer notification', err.message);
    }
  }
}
