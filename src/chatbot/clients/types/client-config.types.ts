export interface ClientConfig {
  id: string;
  businessName: string;
  services: string;
  pricing: string | null;
  businessHours: string;
  location: string | null;
  website: string | null;
  toneDescription: string;
  languages: string[];
  escalationKeywords: string[] | null;
  escalationSla: string;
  fallbackMessage: string | null;
  canBook: boolean;
  bookingUrl: string | null;
  instagramPageId: string | null;
  whatsappPhoneId: string | null;
  isActive: boolean;
}
