import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';

@Controller('internal/booking')
export class InternalBookingController {
  private readonly logger = new Logger(InternalBookingController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly availabilityService: AvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  private validateSecret(secret: string) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
  }

  @Post('availability')
  @HttpCode(200)
  async getAvailability(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { clientId: string; fromDate: string; toDate: string },
  ) {
    this.validateSecret(secret);
    return this.availabilityService.getAvailableSlots(body.clientId, body.fromDate, body.toDate);
  }

  @Post('create')
  @HttpCode(200)
  async createBooking(
    @Headers('x-internal-secret') secret: string,
    @Body() body: {
      clientId: string;
      conversationId?: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      service?: string;
      startTime: string;
    },
  ) {
    this.validateSecret(secret);
    return this.bookingService.createBooking(body);
  }

  @Post('confirm')
  @HttpCode(200)
  async confirmBooking(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { appointmentId: string },
  ) {
    this.validateSecret(secret);
    // Dashboard already updates status — just send notification
    await this.bookingService.notifyCustomer(body.appointmentId, 'confirmed');
    return { success: true };
  }

  @Post('decline')
  @HttpCode(200)
  async declineBooking(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { appointmentId: string; reason?: string },
  ) {
    this.validateSecret(secret);
    // Dashboard already updates status — just send notification
    await this.bookingService.notifyCustomer(body.appointmentId, 'declined');
    return { success: true };
  }

  @Post('cancel')
  @HttpCode(200)
  async cancelBooking(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { appointmentId: string },
  ) {
    this.validateSecret(secret);
    const success = await this.bookingService.cancelBooking(body.appointmentId);
    return { success };
  }

  @Post('action')
  @HttpCode(200)
  async handleAction(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { token: string; action: 'accept' | 'decline' },
  ) {
    this.validateSecret(secret);

    const appointment = await this.bookingService.getByActionToken(body.token);
    if (!appointment) {
      return { success: false, error: 'Invalid or expired token' };
    }

    if (appointment.status !== 'pending') {
      return { success: false, error: 'Booking already processed', status: appointment.status };
    }

    if (appointment.actionTokenExpiresAt && new Date() > appointment.actionTokenExpiresAt) {
      return { success: false, error: 'Token expired' };
    }

    if (body.action === 'accept') {
      const success = await this.bookingService.confirmBooking(appointment.id);
      if (success) await this.bookingService.notifyCustomer(appointment.id, 'confirmed');
      return { success, action: 'confirmed' };
    } else {
      const success = await this.bookingService.declineBooking(appointment.id);
      if (success) await this.bookingService.notifyCustomer(appointment.id, 'declined');
      return { success, action: 'declined' };
    }
  }
}
