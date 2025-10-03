// Contact form types for Better Now application

export interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  guests: number;
  event_date: string;
  message?: string;
  status: 'new' | 'read' | 'responded' | 'unread';
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  event_type: string;
  guests: number;
  event_date: string;
  message?: string;
}