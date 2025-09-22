/**
 * Tipos e interfaces para os componentes do Footer
 */

export interface ContactInfoProps {
  contactEmail: string;
  phone: string;
  address: string;
  translations: {
    contactInfo: string;
  };
}

export interface BusinessHoursProps {
  businessHoursWeekdays?: string;
  businessHoursWeekend?: string;
  businessHoursClosedDays?: string;
  translations: {
    businessHours: string;
    mondayToFriday: string;
    saturday: string;
    sundaysAndHolidays: string;
  };
}

export interface SocialMediaProps {
  translations: {
    followUs: string;
    followUsInstagram: string;
  };
}

export interface DeveloperInfoProps {
  logoSrc: string;
}

export interface FooterTranslations {
  contactInfo: string;
  businessHours: string;
  mondayToFriday: string;
  saturday: string;
  sundaysAndHolidays: string;
  followUs: string;
  followUsInstagram: string;
  footerCopyright: string;
  footerTagline: string;
}

export interface AppSettings {
  contact_email: string;
  phone: string;
  address: string;
  business_hours_weekdays?: string;
  business_hours_weekend?: string;
  business_hours_closed_days?: string;
}