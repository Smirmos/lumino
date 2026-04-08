export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BusinessHoursStructured {
  sunday: DayHours;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
}

export interface Holiday {
  date: string;       // ISO date "2026-04-15"
  name: string;       // "Passover"
  isOpen: boolean;    // false = closed all day
  openTime?: string;  // custom hours if open
  closeTime?: string;
}

export interface ClientConfig {
  id: string;
  businessName: string;
  services: string;
  pricing: string | null;
  businessHours: string;
  businessHoursStructured: BusinessHoursStructured | null;
  holidays: Holiday[] | null;
  location: string | null;
  website: string | null;
  businessDescription: string | null;
  faq: string | null;
  policies: string | null;
  customInstructions: string | null;
  toneDescription: string;
  languages: string[];
  escalationKeywords: string[] | null;
  escalationSla: string;
  fallbackMessage: string | null;
  canBook: boolean;
  bookingUrl: string | null;
  instagramPageId: string | null;
  whatsappPhoneId: string | null;
  managerPhone: string | null;
  isActive: boolean;
}
