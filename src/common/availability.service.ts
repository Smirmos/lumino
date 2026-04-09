import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';
import { Db } from '../db';
import { clientConfigs, appointments } from '../db/schema';

interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
}

interface DayAvailability {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  slots: TimeSlot[];
}

export interface AvailabilityResult {
  slots: DayAvailability[];
  slotDurationMinutes: number;
  timezone: string;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(@Inject('DB') private readonly db: Db) {}

  async getAvailableSlots(
    clientId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityResult> {
    // 1. Fetch client config
    const [config] = await this.db
      .select()
      .from(clientConfigs)
      .where(eq(clientConfigs.id, clientId))
      .limit(1);

    if (!config || !config.bookingEnabled) {
      return { slots: [], slotDurationMinutes: 60, timezone: 'Asia/Jerusalem' };
    }

    const slotDurationMinutes = config.slotDurationMinutes ?? 60;
    const maxConcurrentBookings = config.maxConcurrentBookings ?? 1;
    const bufferMinutes = config.bufferMinutes ?? 0;
    const timezone = config.timezone ?? 'Asia/Jerusalem';
    const { businessHoursStructured, holidays } = config;

    if (!businessHoursStructured) {
      return { slots: [], slotDurationMinutes, timezone };
    }

    const hours = businessHoursStructured as Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;

    // 2. Fetch existing bookings in date range
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');

    const existingBookings = await this.db
      .select({
        startTime: appointments.startTime,
        endTime: appointments.endTime,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          inArray(appointments.status, ['pending', 'confirmed']),
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
        ),
      );

    // 3. Generate slots for each day
    const holidayMap = new Map<string, { isOpen: boolean; openTime?: string; closeTime?: string }>();
    if (Array.isArray(holidays)) {
      for (const h of holidays as Array<{ date: string; isOpen: boolean; openTime?: string; closeTime?: string }>) {
        holidayMap.set(h.date, h);
      }
    }

    const result: DayAvailability[] = [];
    const current = new Date(fromDate);
    const end = new Date(toDate);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayIndex = current.getDay();
      const dayKey = DAY_KEYS[dayIndex];
      const holiday = holidayMap.get(dateStr);

      let dayOpen: string | undefined;
      let dayClose: string | undefined;
      let isOpen = false;

      if (holiday) {
        isOpen = holiday.isOpen;
        dayOpen = holiday.openTime;
        dayClose = holiday.closeTime;
      } else {
        const dayHours = hours[dayKey];
        if (dayHours) {
          isOpen = dayHours.isOpen;
          dayOpen = dayHours.openTime;
          dayClose = dayHours.closeTime;
        }
      }

      if (isOpen && dayOpen && dayClose) {
        const slots = this.generateSlots(
          dateStr,
          dayOpen,
          dayClose,
          slotDurationMinutes,
          bufferMinutes,
          maxConcurrentBookings,
          existingBookings,
        );
        if (slots.length > 0) {
          result.push({
            date: dateStr,
            dayOfWeek: dayKey,
            slots,
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return { slots: result, slotDurationMinutes, timezone };
  }

  private generateSlots(
    date: string,
    openTime: string,
    closeTime: string,
    durationMinutes: number,
    bufferMinutes: number,
    maxConcurrent: number,
    existingBookings: Array<{ startTime: Date | null; endTime: Date | null }>,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const step = durationMinutes + bufferMinutes;

    const now = new Date();

    for (let m = openMinutes; m + durationMinutes <= closeMinutes; m += step) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      const slotStart = new Date(`${date}T${timeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Skip slots in the past
      if (slotStart < now) continue;

      // Count overlapping bookings
      const overlapping = existingBookings.filter((b) => {
        if (!b.startTime || !b.endTime) return false;
        return b.startTime < slotEnd && b.endTime > slotStart;
      }).length;

      slots.push({
        time: timeStr,
        available: overlapping < maxConcurrent,
      });
    }

    return slots;
  }

  formatSlotsForPrompt(availability: AvailabilityResult): string {
    const lines: string[] = [];
    const dayNames: Record<string, string> = {
      sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday',
      wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
    };

    for (const day of availability.slots) {
      const available = day.slots.filter((s) => s.available).map((s) => s.time);
      if (available.length > 0) {
        const dateLabel = `${dayNames[day.dayOfWeek]} ${day.date}`;
        lines.push(`${dateLabel}: ${available.join(', ')}`);
      }
    }

    return lines.join('\n');
  }
}
